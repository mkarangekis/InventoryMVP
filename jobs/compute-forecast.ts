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

const runDate = argMap.get("date") ?? new Date().toISOString().slice(0, 10);
const tenantId = argMap.get("tenant") ?? null;
const locationId = argMap.get("location") ?? null;

const sql = postgres(databaseUrl, { prepare: false });

const run = async () => {
  console.info("compute-forecast start", { runDate, tenantId, locationId });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'compute-forecast', 'running')
    returning id
  `;

  try {
    await sql`
      delete from demand_forecasts_daily
      where forecast_date between ${runDate}::date and (${runDate}::date + interval '13 days')
        and (${tenantId}::uuid is null or tenant_id = ${tenantId})
        and (${locationId}::uuid is null or location_id = ${locationId});
    `;

    await sql`
      with history as (
        select
          ii.id as inventory_item_id,
          tud.location_id,
          tud.tenant_id,
          tud.usage_date,
          sum(tud.ounces_used) as ounces_used
        from theoretical_usage_daily tud
        join inventory_items ii
          on ii.ingredient_id = tud.ingredient_id
          and ii.location_id = tud.location_id
          and ii.tenant_id = tud.tenant_id
        where tud.usage_date >= ${runDate}::date - interval '56 days'
          and tud.usage_date < ${runDate}::date
          and (${tenantId}::uuid is null or tud.tenant_id = ${tenantId})
          and (${locationId}::uuid is null or tud.location_id = ${locationId})
        group by ii.id, tud.location_id, tud.tenant_id, tud.usage_date
      ),
      weekday_stats as (
        select
          inventory_item_id,
          location_id,
          tenant_id,
          extract(dow from usage_date) as dow,
          avg(ounces_used) as avg_oz,
          count(*) as day_count
        from history
        group by inventory_item_id, location_id, tenant_id, extract(dow from usage_date)
      ),
      overall_stats as (
        select
          inventory_item_id,
          location_id,
          tenant_id,
          avg(ounces_used) as avg_oz
        from history
        group by inventory_item_id, location_id, tenant_id
      ),
      forecast_dates as (
        select (${runDate}::date + gs.day)::date as forecast_date
        from generate_series(0, 13) as gs(day)
      ),
      expanded as (
        select
          os.tenant_id,
          os.location_id,
          os.inventory_item_id,
          fd.forecast_date,
          ws.avg_oz as weekday_avg,
          ws.day_count,
          os.avg_oz as overall_avg,
          extract(dow from fd.forecast_date) as dow
        from overall_stats os
        cross join forecast_dates fd
        left join weekday_stats ws
          on ws.inventory_item_id = os.inventory_item_id
          and ws.location_id = os.location_id
          and ws.tenant_id = os.tenant_id
          and ws.dow = extract(dow from fd.forecast_date)
      )
      insert into demand_forecasts_daily (
        tenant_id,
        location_id,
        forecast_date,
        inventory_item_id,
        forecast_usage_oz,
        method,
        computed_at
      )
      select
        tenant_id,
        location_id,
        forecast_date,
        inventory_item_id,
        case when coalesce(day_count, 0) >= 3 then weekday_avg else overall_avg end as forecast_usage_oz,
        'dow_baseline' as method,
        now() as computed_at
      from expanded;
    `;

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("compute-forecast done");
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
  console.error("compute-forecast failed", error);
  process.exit(1);
});
