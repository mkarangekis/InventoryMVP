import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

const env: Record<string, string> = {};
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
const argMap = new Map<string, string>();
for (const arg of args) {
  const [key, value] = arg.replace(/^--/, "").split("=");
  if (key && value) {
    argMap.set(key, value);
  }
}

const from = argMap.get("from") ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const to = argMap.get("to") ?? from;
const tenantId = argMap.get("tenant") ?? null;
const locationId = argMap.get("location") ?? null;

const sql = postgres(databaseUrl, { prepare: false });

const run = async () => {
  console.info("compute-theoretical-usage start", {
    from,
    to,
    tenantId,
    locationId,
  });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'compute-theoretical-usage', 'running')
    returning id
  `;

  try {
    await sql`
      insert into theoretical_usage_daily (
        tenant_id,
        location_id,
        usage_date,
        ingredient_id,
        ounces_used,
        computed_at
      )
      select
        oi.tenant_id,
        oi.location_id,
        o.closed_at::date as usage_date,
        dsl.ingredient_id,
        sum(oi.quantity * dsl.ounces) as ounces_used,
        now() as computed_at
      from pos_order_items oi
      join pos_orders o
        on o.pos_order_id = oi.pos_order_id
        and o.location_id = oi.location_id
        and o.tenant_id = oi.tenant_id
      join drink_specs ds
        on ds.menu_item_id = oi.menu_item_id
        and ds.location_id = oi.location_id
        and ds.tenant_id = oi.tenant_id
        and ds.active = 1
      join drink_spec_lines dsl
        on dsl.drink_spec_id = ds.id
      where o.closed_at::date between ${from}::date and ${to}::date
        and (${tenantId}::uuid is null or o.tenant_id = ${tenantId})
        and (${locationId}::uuid is null or o.location_id = ${locationId})
      group by
        oi.tenant_id,
        oi.location_id,
        o.closed_at::date,
        dsl.ingredient_id
      on conflict (tenant_id, location_id, usage_date, ingredient_id)
      do update set
        ounces_used = excluded.ounces_used,
        computed_at = excluded.computed_at;
    `;

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("compute-theoretical-usage done");
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
  console.error("compute-theoretical-usage failed", error);
  process.exit(1);
});
