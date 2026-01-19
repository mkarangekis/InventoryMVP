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
  console.info("generate-draft-pos start", { runDate, tenantId, locationId });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'generate-draft-pos', 'running')
    returning id
  `;

  try {
    await sql`
      delete from purchase_orders
      where status = 'draft'
        and (${tenantId}::uuid is null or tenant_id = ${tenantId})
        and (${locationId}::uuid is null or location_id = ${locationId});
    `;

    const candidates = await sql`
      with latest_snapshot as (
        select distinct on (s.location_id)
          s.id as snapshot_id,
          s.tenant_id,
          s.location_id,
          s.snapshot_date
        from inventory_snapshots s
        where (${tenantId}::uuid is null or s.tenant_id = ${tenantId})
          and (${locationId}::uuid is null or s.location_id = ${locationId})
        order by s.location_id, s.snapshot_date desc
      ),
      current_inventory as (
        select
          ls.tenant_id,
          ls.location_id,
          isl.inventory_item_id,
          isl.actual_remaining_oz
        from latest_snapshot ls
        join inventory_snapshot_lines isl on isl.snapshot_id = ls.snapshot_id
      ),
      forecasts as (
        select
          df.tenant_id,
          df.location_id,
          df.inventory_item_id,
          sum(case when df.forecast_date <= (${runDate}::date + (vi.lead_time_days || ' days')::interval) then df.forecast_usage_oz else 0 end) as usage_to_arrival,
          sum(df.forecast_usage_oz) as usage_through_buffer
        from demand_forecasts_daily df
        join reorder_policies rp on rp.inventory_item_id = df.inventory_item_id
        join inventory_items ii on ii.id = df.inventory_item_id
        join vendor_items vi on vi.inventory_item_id = ii.id
        where df.forecast_date between ${runDate}::date and (${runDate}::date + (rp.lead_time_days + rp.safety_buffer_days) * interval '1 day')
          and (${tenantId}::uuid is null or df.tenant_id = ${tenantId})
          and (${locationId}::uuid is null or df.location_id = ${locationId})
        group by df.tenant_id, df.location_id, df.inventory_item_id, vi.lead_time_days
      )
      select
        rp.tenant_id,
        rp.location_id,
        vi.vendor_id,
        rp.inventory_item_id,
        vi.unit_size_oz,
        vi.unit_price,
        rp.reorder_point_oz,
        rp.par_level_oz,
        rp.lead_time_days,
        rp.safety_buffer_days,
        coalesce(ci.actual_remaining_oz, 0) as actual_remaining_oz,
        coalesce(f.usage_through_buffer, 0) as usage_through_buffer,
        coalesce(f.usage_to_arrival, 0) as usage_to_arrival
      from reorder_policies rp
      join inventory_items ii on ii.id = rp.inventory_item_id
      join vendor_items vi on vi.inventory_item_id = ii.id
      left join current_inventory ci on ci.inventory_item_id = rp.inventory_item_id
        and ci.location_id = rp.location_id
        and ci.tenant_id = rp.tenant_id
      left join forecasts f on f.inventory_item_id = rp.inventory_item_id
        and f.location_id = rp.location_id
        and f.tenant_id = rp.tenant_id
      where (${tenantId}::uuid is null or rp.tenant_id = ${tenantId})
        and (${locationId}::uuid is null or rp.location_id = ${locationId});
    `;

    const linesByVendor = new Map<string, any[]>();

    for (const row of candidates) {
      const projectedRemaining = row.actual_remaining_oz - row.usage_through_buffer;
      if (projectedRemaining >= row.reorder_point_oz) {
        continue;
      }

      const projectedAtArrival = row.actual_remaining_oz - row.usage_to_arrival;
      const qtyUnits = Math.max(
        0,
        Math.ceil((row.par_level_oz - projectedAtArrival) / row.unit_size_oz),
      );

      if (qtyUnits <= 0) {
        continue;
      }

      const line = {
        tenant_id: row.tenant_id,
        location_id: row.location_id,
        vendor_id: row.vendor_id,
        inventory_item_id: row.inventory_item_id,
        qty_units: qtyUnits,
        unit_size_oz: row.unit_size_oz,
        unit_price: row.unit_price,
        line_total: qtyUnits * row.unit_price,
      };

      const key = `${row.vendor_id}:${row.location_id}`;
      const list = linesByVendor.get(key) ?? [];
      list.push(line);
      linesByVendor.set(key, list);
    }

    for (const [key, lines] of linesByVendor.entries()) {
      const [vendorId, location] = key.split(":");
      const tenant = lines[0].tenant_id;

      const [po] = await sql`
        insert into purchase_orders (
          tenant_id,
          location_id,
          vendor_id,
          status,
          created_at
        ) values (
          ${tenant},
          ${location},
          ${vendorId},
          'draft',
          now()
        )
        returning id
      `;

      for (const line of lines) {
        await sql`
          insert into purchase_order_lines (
            tenant_id,
            purchase_order_id,
            inventory_item_id,
            qty_units,
            unit_size_oz,
            unit_price,
            line_total
          ) values (
            ${line.tenant_id},
            ${po.id},
            ${line.inventory_item_id},
            ${line.qty_units},
            ${line.unit_size_oz},
            ${line.unit_price},
            ${line.line_total}
          )
        `;
      }
    }

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("generate-draft-pos done", { count: linesByVendor.size });
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
  console.error("generate-draft-pos failed", error);
  process.exit(1);
});
