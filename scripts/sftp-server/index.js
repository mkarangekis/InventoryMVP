/**
 * Pourdex Toast SFTP ingest server
 *
 * Runs on a VPS. Toast Hub pushes nightly CSV exports via SFTP.
 * When a session closes we collect OrderDetails.csv + ItemSelectionDetails.csv
 * and POST them to the Vercel ingest endpoint.
 *
 * Required env vars:
 *   SFTP_PORT            — port to listen on (default 2222)
 *   HOST_KEY_PATH        — path to PEM host private key (e.g. /etc/ssh/sftp_host_rsa)
 *   DB_API_URL           — Supabase REST URL to look up credentials, or inline credential map
 *   VERCEL_URL           — https://your-app.vercel.app
 *   TOAST_WEBHOOK_SECRET — shared secret sent to Vercel webhook
 *
 * Credential lookup: we call DB_API_URL/rest/v1/pos_connections with the
 * sftp_username to find the matching location. Alternatively set CREDENTIALS_JSON
 * to a JSON map of { username: { password, locationId } } for zero-DB operation.
 */

const { Server } = require("ssh2");
const fs = require("fs");
const https = require("https");
const http = require("http");

const SFTP_PORT = parseInt(process.env.SFTP_PORT ?? "2222", 10);
const VERCEL_URL = (process.env.VERCEL_URL ?? "").replace(/\/$/, "");
const TOAST_WEBHOOK_SECRET = process.env.TOAST_WEBHOOK_SECRET ?? "";
const HOST_KEY_PATH = process.env.HOST_KEY_PATH ?? "/etc/ssh/sftp_host_rsa";
const DB_API_URL = (process.env.DB_API_URL ?? "").replace(/\/$/, "");
const DB_API_KEY = process.env.DB_API_KEY ?? "";

// Optional: inline credential map to avoid DB calls
// Format: { "username": { "password": "...", "locationId": "uuid" } }
let inlineCredentials = {};
try {
  if (process.env.CREDENTIALS_JSON) {
    inlineCredentials = JSON.parse(process.env.CREDENTIALS_JSON);
  }
} catch (e) {
  console.error("Failed to parse CREDENTIALS_JSON", e.message);
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
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const hostKey = fs.readFileSync(HOST_KEY_PATH);

const server = new Server({ hostKeys: [hostKey] }, (client) => {
  console.log("Client connected");

  let username = "";
  let locationId = "";

  // Files collected in this session
  const files = { orders: null, items: null };

  client.on("authentication", async (ctx) => {
    if (ctx.method !== "password") {
      return ctx.reject(["password"]);
    }

    const cred = await lookupCredential(ctx.username);
    if (!cred || cred.password !== ctx.password) {
      return ctx.reject();
    }

    username = ctx.username;
    locationId = cred.locationId;
    console.log(`Auth OK: ${username} → location ${locationId}`);
    ctx.accept();
  });

  client.on("ready", () => {
    client.on("session", (accept) => {
      const session = accept();
      session.on("sftp", (accept) => {
        const sftp = accept();
        const openHandles = new Map();
        let handleCounter = 0;

        // OPEN
        sftp.on("OPEN", (reqId, filename, flags) => {
          const handle = Buffer.alloc(4);
          handle.writeUInt32BE(++handleCounter, 0);
          openHandles.set(handleCounter, { filename, data: [] });
          sftp.handle(reqId, handle);
        });

        // WRITE
        sftp.on("WRITE", (reqId, handle, offset, data) => {
          const id = handle.readUInt32BE(0);
          const entry = openHandles.get(id);
          if (entry) entry.data.push(Buffer.from(data));
          sftp.status(reqId, 0); // SSH_FX_OK
        });

        // CLOSE
        sftp.on("CLOSE", (reqId, handle) => {
          const id = handle.readUInt32BE(0);
          const entry = openHandles.get(id);
          if (entry) {
            const content = Buffer.concat(entry.data).toString("utf-8");
            const name = entry.filename.toLowerCase();

            if (name.includes("orderdetails") || name.includes("order_details")) {
              files.orders = content;
              console.log(`Received orders file (${content.length} bytes)`);
            } else if (
              name.includes("itemselection") || name.includes("item_selection")
            ) {
              files.items = content;
              console.log(`Received items file (${content.length} bytes)`);
            } else {
              console.log(`Ignoring unknown file: ${entry.filename}`);
            }

            openHandles.delete(id);
          }
          sftp.status(reqId, 0);
        });

        // REALPATH — Toast may probe the path
        sftp.on("REALPATH", (reqId, path) => {
          sftp.name(reqId, [{ filename: path, longname: path, attrs: {} }]);
        });

        // STAT / LSTAT — satisfy file existence checks
        sftp.on("STAT", (reqId) => {
          sftp.attrs(reqId, { mode: 0o755, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 });
        });
        sftp.on("LSTAT", (reqId) => {
          sftp.attrs(reqId, { mode: 0o755, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 });
        });

        // MKDIR / OPENDIR / READDIR — no-ops
        sftp.on("MKDIR", (reqId) => sftp.status(reqId, 0));
        sftp.on("OPENDIR", (reqId) => {
          const handle = Buffer.alloc(4);
          handle.writeUInt32BE(++handleCounter, 0);
          sftp.handle(reqId, handle);
        });
        sftp.on("READDIR", (reqId) => sftp.status(reqId, 1)); // EOF
      });
    });
  });

  client.on("end", async () => {
    console.log(`Client disconnected: ${username}`);
    if (!files.orders || !files.items || !locationId) {
      console.log("Session ended without complete file set — skipping ingest");
      return;
    }

    console.log(`Sending files for location ${locationId} to Vercel...`);
    try {
      const result = await postToVercel(locationId, files.orders, files.items);
      console.log(`Vercel ingest response: ${result.status} ${result.body}`);
    } catch (err) {
      console.error("Failed to post to Vercel:", err.message);
    }
  });
});

server.listen(SFTP_PORT, "0.0.0.0", () => {
  console.log(`Pourdex SFTP server listening on port ${SFTP_PORT}`);
});
