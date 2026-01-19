import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

const env = {};
if (fs.existsSync(envPath)) {
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    env[key.trim()] = rest.join("=").trim();
  }
}

const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const args = process.argv.slice(2);
const argMap = new Map();
for (const arg of args) {
  const [key, value] = arg.replace(/^--/, "").split("=");
  if (key && value) {
    argMap.set(key, value);
  }
}

const tenantId = argMap.get("tenant") ?? null;
const locationId = argMap.get("location") ?? null;
const runId = argMap.get("run") ?? null;

const sql = postgres(databaseUrl, { prepare: false });

const run = async () => {
  console.info("process-import-run start", { tenantId, locationId, runId });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'process-import-run', 'running')
    returning id
  `;

  try {
    const runs = await sql`
      select id, tenant_id, location_id, status, started_at
      from pos_import_runs
      where (${runId}::uuid is null or id = ${runId})
        and (${tenantId}::uuid is null or tenant_id = ${tenantId})
        and (${locationId}::uuid is null or location_id = ${locationId})
        and status in ('pending', 'processing')
      order by started_at asc
      limit 20
    `;

    let completedCount = 0;
    let failedCount = 0;

    for (const row of runs) {
      const [rawCount] = await sql`
        select count(*)::int as count
        from pos_import_rows
        where import_run_id = ${row.id}
      `;

      if ((rawCount?.count ?? 0) > 0) {
        await sql`
          update pos_import_runs
          set status = 'completed',
              finished_at = coalesce(finished_at, now())
          where id = ${row.id}
        `;
        completedCount += 1;
        continue;
      }

      const startedAt = row.started_at ? new Date(row.started_at) : null;
      const stale =
        startedAt && Date.now() - startedAt.getTime() > 30 * 60 * 1000;

      if (stale) {
        await sql`
          update pos_import_runs
          set status = 'failed',
              error_summary = 'No rows loaded within 30 minutes.',
              finished_at = now()
          where id = ${row.id}
        `;
        failedCount += 1;
      }
    }

    await sql`
      update job_runs
      set status = 'completed', finished_at = now(),
          details = ${JSON.stringify({ completedCount, failedCount })}
      where id = ${jobRun.id}
    `;

    console.info("process-import-run done", { completedCount, failedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await sql`
      update job_runs
      set status = 'failed', finished_at = now(), details = ${message}
      where id = ${jobRun.id}
    `;
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

run().catch((error) => {
  console.error("process-import-run failed", error);
  process.exit(1);
});
