/**
 * Pourdex Toast SFTP ingest server
 *
 * Runs on a VPS. Toast Hub pushes nightly CSV exports via SFTP.
 * When a session closes:
 *  1. Raw CSVs are written to disk as a backup
 *  2. The Vercel ingest webhook is called with up to 3 retries (5s, 15s, 45s backoff)
 *  3. All failures are logged to stdout and to /var/pourdex/logs/errors.log
 *
 * Required env vars:
 *   SFTP_PORT            — port to listen on (default 2222)
 *   HOST_KEY_PATH        — path to PEM host private key
 *   VERCEL_URL           — https://your-app.vercel.app
 *   TOAST_WEBHOOK_SECRET — shared secret sent to Vercel webhook
 *
 * Credential lookup (choose one):
 *   CREDENTIALS_JSON     — inline JSON map { username: { password, locationId } }
 *   DB_API_URL + DB_API_KEY — look up from Supabase pos_connections table
 *
 * Backup files are written to:
 *   BACKUP_DIR/YYYY-MM-DD/{username}/OrderDetails.csv
 *   BACKUP_DIR/YYYY-MM-DD/{username}/ItemSelectionDetails.csv
 * Default BACKUP_DIR: /var/pourdex/backups
 */

const { Server } = require("ssh2");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const https = require("https");
const http = require("http");

const SFTP_PORT = parseInt(process.env.SFTP_PORT ?? "2222", 10);
const VERCEL_URL = (process.env.VERCEL_URL ?? "").replace(/\/$/, "");
const TOAST_WEBHOOK_SECRET = process.env.TOAST_WEBHOOK_SECRET ?? "";
const HOST_KEY_PATH = process.env.HOST_KEY_PATH ?? "/etc/ssh/sftp_host_rsa";
const DB_API_URL = (process.env.DB_API_URL ?? "").replace(/\/$/, "");
const DB_API_KEY = process.env.DB_API_KEY ?? "";
const BACKUP_DIR = process.env.BACKUP_DIR ?? "/var/pourdex/backups";
const LOG_FILE = process.env.LOG_FILE ?? "/var/pourdex/logs/errors.log";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

// Ensure log directory exists at startup
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

let inlineCredentials = {};
try {
  if (process.env.CREDENTIALS_JSON) {
    inlineCredentials = JSON.parse(process.env.CREDENTIALS_JSON);
  }
} catch (e) {
  logError("Failed to parse CREDENTIALS_JSON: " + e.message);
}

function logError(msg, extra = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), msg, ...extra }) + "\n";
  console.error(line.trim());
  fs.appendFile(LOG_FILE, line, () => {});
}

function logInfo(msg, extra = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg, ...extra }));
}

async function lookupCredential(username) {
  if (inlineCredentials[username]) return inlineCredentials[username];
  if (!DB_API_URL || !DB_API_KEY) return null;

  const url = `${DB_API_URL}/rest/v1/pos_connections?sftp_username=eq.${encodeURIComponent(username)}&select=sftp_password,location_id&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: DB_API_KEY, Authorization: `Bearer ${DB_API_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { password: rows[0].sftp_password, locationId: rows[0].location_id };
}

async function writeBackup(username, orders, items) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(BACKUP_DIR, date, username);
  await fsPromises.mkdir(dir, { recursive: true });

  const ordersPath = path.join(dir, "OrderDetails.csv");
  const itemsPath = path.join(dir, "ItemSelectionDetails.csv");

  await fsPromises.writeFile(ordersPath, orders, "utf-8");
  await fsPromises.writeFile(itemsPath, items, "utf-8");

  logInfo("Backup written", { username, dir });
  return dir;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postToVercel(locationId, orders, items) {
  const body = JSON.stringify({ locationId, orders, items });
  const url = new URL(`${VERCEL_URL}/api/ingest/toast-webhook`);
  const lib = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-toast-webhook-secret": TOAST_WEBHOOK_SECRET,
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 60_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.write(body);
    req.end();
  });
}

async function postWithRetry(locationId, orders, items, username, backupDir) {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      logInfo(`Retry attempt ${attempt} in ${delay / 1000}s`, { locationId, username });
      await sleep(delay);
    }

    try {
      const result = await postToVercel(locationId, orders, items);
      if (result.status >= 200 && result.status < 300) {
        logInfo("Webhook delivered", { locationId, username, status: result.status, attempt: attempt + 1 });
        return result;
      }
      lastError = new Error(`HTTP ${result.status}: ${result.body.slice(0, 200)}`);
      logError(`Webhook returned ${result.status}`, { locationId, username, attempt: attempt + 1, body: result.body.slice(0, 200) });
    } catch (err) {
      lastError = err;
      logError("Webhook request failed", { locationId, username, attempt: attempt + 1, error: err.message });
    }
  }

  // All retries exhausted — log prominently so ops can manually replay from backup
  logError("ALL RETRIES EXHAUSTED — manual replay required", {
    locationId,
    username,
    backupDir,
    instructions: `curl -X POST ${VERCEL_URL}/api/ingest/toast-webhook -H 'x-toast-webhook-secret: <SECRET>' -H 'Content-Type: application/json' -d @${backupDir}/payload.json`,
    error: lastError?.message,
  });

  // Write a ready-to-replay payload JSON alongside the CSVs
  try {
    const replayPayload = JSON.stringify({ locationId, orders, items });
    await fsPromises.writeFile(path.join(backupDir, "payload.json"), replayPayload, "utf-8");
  } catch (_) { /* non-critical */ }

  throw lastError;
}

const hostKey = fs.readFileSync(HOST_KEY_PATH);

const server = new Server({ hostKeys: [hostKey] }, (client) => {
  logInfo("Client connected");

  let username = "";
  let locationId = "";
  const files = { orders: null, items: null };

  client.on("authentication", async (ctx) => {
    if (ctx.method !== "password") return ctx.reject(["password"]);

    const cred = await lookupCredential(ctx.username).catch(() => null);
    if (!cred || cred.password !== ctx.password) return ctx.reject();

    username = ctx.username;
    locationId = cred.locationId;
    logInfo("Auth OK", { username, locationId });
    ctx.accept();
  });

  client.on("ready", () => {
    client.on("session", (accept) => {
      const session = accept();
      session.on("sftp", (accept) => {
        const sftp = accept();
        const openHandles = new Map();
        let handleCounter = 0;

        sftp.on("OPEN", (reqId, filename) => {
          const handle = Buffer.alloc(4);
          handle.writeUInt32BE(++handleCounter, 0);
          openHandles.set(handleCounter, { filename, data: [] });
          sftp.handle(reqId, handle);
        });

        sftp.on("WRITE", (reqId, handle, _offset, data) => {
          const entry = openHandles.get(handle.readUInt32BE(0));
          if (entry) entry.data.push(Buffer.from(data));
          sftp.status(reqId, 0);
        });

        sftp.on("CLOSE", (reqId, handle) => {
          const id = handle.readUInt32BE(0);
          const entry = openHandles.get(id);
          if (entry) {
            const content = Buffer.concat(entry.data).toString("utf-8");
            const name = entry.filename.toLowerCase();
            if (name.includes("orderdetails") || name.includes("order_details")) {
              files.orders = content;
              logInfo("Received orders file", { username, bytes: content.length });
            } else if (name.includes("itemselection") || name.includes("item_selection")) {
              files.items = content;
              logInfo("Received items file", { username, bytes: content.length });
            } else {
              logInfo("Ignoring unknown file", { username, filename: entry.filename });
            }
            openHandles.delete(id);
          }
          sftp.status(reqId, 0);
        });

        sftp.on("REALPATH", (reqId, p) => sftp.name(reqId, [{ filename: p, longname: p, attrs: {} }]));
        sftp.on("STAT", (reqId) => sftp.attrs(reqId, { mode: 0o755, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 }));
        sftp.on("LSTAT", (reqId) => sftp.attrs(reqId, { mode: 0o755, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 }));
        sftp.on("MKDIR", (reqId) => sftp.status(reqId, 0));
        sftp.on("OPENDIR", (reqId) => {
          const handle = Buffer.alloc(4);
          handle.writeUInt32BE(++handleCounter, 0);
          sftp.handle(reqId, handle);
        });
        sftp.on("READDIR", (reqId) => sftp.status(reqId, 1));
      });
    });
  });

  client.on("end", async () => {
    logInfo("Session closed", { username });
    if (!files.orders || !files.items || !locationId) {
      logInfo("Incomplete file set — skipping", { username, hasOrders: !!files.orders, hasItems: !!files.items });
      return;
    }

    let backupDir = BACKUP_DIR;
    try {
      backupDir = await writeBackup(username, files.orders, files.items);
    } catch (err) {
      logError("Backup write failed (continuing anyway)", { username, error: err.message });
    }

    logInfo("Dispatching to Vercel", { locationId, username });
    try {
      await postWithRetry(locationId, files.orders, files.items, username, backupDir);
    } catch (_) {
      // postWithRetry already logged — nothing more to do here
    }
  });
});

server.listen(SFTP_PORT, "0.0.0.0", () => {
  logInfo(`Pourdex SFTP server listening on port ${SFTP_PORT}`);
});
