/**
 * compute-variance.ts
 *
 * Phase 2: Per-ingredient Z-score variance detection with rolling 8-week baselines.
 *
 * Algorithm:
 *  1. Compute raw variance (oz delta) same as before
 *  2. Upsert variance_baselines with rolling mean + stddev over the last 8 weeks
 *  3. Compute Z-score = (variance_oz - mean) / stddev
 *  4. Severity mapped from Z-score:  z < 1 → none, 1-2 → low, 2-3 → med, >3 → high
 *     (falls back to fixed % thresholds when baseline has < 4 samples)
 *  5. Track trend slope (linear regression over 8-week z-scores)
 */
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
if (!databaseUrl) { console.error("DATABASE_URL is not set"); process.exit(1); }

const args = process.argv.slice(2);
const argMap = new Map<string, string>();
for (const arg of args) {
  const [key, value] = arg.replace(/^--/, "").split("=");
  if (key && value) argMap.set(key, value);
}

const tenantId  = argMap.get("tenant")   ?? null;
const locationId = argMap.get("location") ?? null;

const sql = postgres(databaseUrl, { prepare: false });

const run = async () => {
  console.info("compute-variance start", { tenantId, locationId });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'compute-variance', 'running')
    returning id
  `;

  try {
    // ── Step 1: Compute raw variance (same CTE as before) ────────────────────
    await sql`
      with latest_snapshot as (
        select distinct on (s.location_id)
          s.id as snapshot_id, s.tenant_id, s.location_id, s.snapshot_date
        from inventory_snapshots s
        where (${tenantId}::uuid is null or s.tenant_id = ${tenantId})
          and (${locationId}::uuid is null or s.location_id = ${locationId})
        order by s.location_id, s.snapshot_date desc
      ),
      previous_snapshot as (
        select distinct on (s.location_id)
          s.id as snapshot_id, s.location_id, s.snapshot_date
        from inventory_snapshots s
        join latest_snapshot ls on ls.location_id = s.location_id
        where s.snapshot_date < ls.snapshot_date
        order by s.location_id, s.snapshot_date desc
      ),
      usage_window as (
        select
          ls.location_id, ls.tenant_id,
          ls.snapshot_id as latest_snapshot_id,
          ps.snapshot_id as prev_snapshot_id,
          ps.snapshot_date as prev_date,
          ls.snapshot_date  as latest_date
        from latest_snapshot ls
        join previous_snapshot ps on ps.location_id = ls.location_id
      ),
      expected as (
        select
          uw.tenant_id, uw.location_id, uw.latest_snapshot_id,
          isl.inventory_item_id,
          isl.actual_remaining_oz as prev_remaining_oz,
          coalesce(sum(tud.ounces_used), 0) as usage_oz
        from usage_window uw
        join inventory_snapshot_lines isl on isl.snapshot_id = uw.prev_snapshot_id
        left join theoretical_usage_daily tud
          on tud.location_id = uw.location_id
          and tud.tenant_id  = uw.tenant_id
          and tud.usage_date > uw.prev_date::date
          and tud.usage_date <= uw.latest_date::date
          and tud.ingredient_id = (
            select ingredient_id from inventory_items ii where ii.id = isl.inventory_item_id
          )
        group by uw.tenant_id, uw.location_id, uw.latest_snapshot_id,
                 isl.inventory_item_id, isl.actual_remaining_oz
      ),
      actual as (
        select
          e.tenant_id, e.location_id, e.latest_snapshot_id,
          e.inventory_item_id, e.prev_remaining_oz, e.usage_oz,
          isl.actual_remaining_oz
        from expected e
        join inventory_snapshot_lines isl
          on isl.snapshot_id = e.latest_snapshot_id
          and isl.inventory_item_id = e.inventory_item_id
      ),
      variance_calc as (
        select
          a.tenant_id, a.location_id, a.latest_snapshot_id,
          a.inventory_item_id,
          (a.prev_remaining_oz - a.usage_oz) as expected_remaining_oz,
          a.actual_remaining_oz,
          (a.actual_remaining_oz - (a.prev_remaining_oz - a.usage_oz)) as variance_oz,
          case
            when (a.prev_remaining_oz - a.usage_oz) = 0 then 0
            else abs(a.actual_remaining_oz - (a.prev_remaining_oz - a.usage_oz))
                 / nullif((a.prev_remaining_oz - a.usage_oz), 0)
          end as variance_pct
        from actual a
      )
      insert into variance_flags (
        tenant_id, location_id, week_start_date, inventory_item_id,
        expected_remaining_oz, actual_remaining_oz, variance_oz, variance_pct,
        severity, created_at
      )
      select
        v.tenant_id, v.location_id,
        (select snapshot_date::date from inventory_snapshots s where s.id = v.latest_snapshot_id),
        v.inventory_item_id,
        v.expected_remaining_oz, v.actual_remaining_oz, v.variance_oz, v.variance_pct,
        -- Temporary severity (overwritten in Step 2 with Z-score-based severity)
        case
          when v.variance_pct >= 0.15 then 'high'
          when v.variance_pct >= 0.10 then 'medium'
          when v.variance_pct >= 0.05 then 'low'
          else 'none'
        end,
        now()
      from variance_calc v
      on conflict do nothing;
    `;

    // ── Step 2: Upsert rolling baselines (8-week window) ────────────────────
    await sql`
      with history as (
        select
          tenant_id, location_id, inventory_item_id,
          abs(variance_oz) as abs_variance_oz,
          week_start_date,
          row_number() over (
            partition by tenant_id, location_id, inventory_item_id
            order by week_start_date desc
          ) as rn
        from variance_flags
        where (${tenantId}::uuid is null or tenant_id = ${tenantId})
          and (${locationId}::uuid is null or location_id = ${locationId})
      ),
      last8 as (
        select
          tenant_id, location_id, inventory_item_id,
          avg(abs_variance_oz)    as rolling_mean_oz,
          stddev_pop(abs_variance_oz) as rolling_stddev_oz,
          count(*)                as sample_count,
          -- linear trend slope via least-squares on week index
          regr_slope(abs_variance_oz, rn) as trend_slope
        from history
        where rn <= 8
        group by tenant_id, location_id, inventory_item_id
      )
      insert into variance_baselines (
        tenant_id, location_id, inventory_item_id,
        rolling_mean_oz, rolling_stddev_oz, sample_count, trend_slope, last_computed_at
      )
      select
        tenant_id, location_id, inventory_item_id,
        coalesce(rolling_mean_oz, 0),
        coalesce(rolling_stddev_oz, 0),
        sample_count,
        coalesce(trend_slope, 0),
        now()
      from last8
      on conflict (tenant_id, location_id, inventory_item_id)
      do update set
        rolling_mean_oz   = excluded.rolling_mean_oz,
        rolling_stddev_oz = excluded.rolling_stddev_oz,
        sample_count      = excluded.sample_count,
        trend_slope       = excluded.trend_slope,
        last_computed_at  = now();
    `;

    // ── Step 3: Back-fill Z-scores + Z-score-based severity on latest flags ──
    await sql`
      update variance_flags vf
      set
        z_score             = case
          when vb.rolling_stddev_oz > 0
          then (abs(vf.variance_oz) - vb.rolling_mean_oz) / vb.rolling_stddev_oz
          else null
        end,
        baseline_mean_oz    = vb.rolling_mean_oz,
        baseline_stddev_oz  = vb.rolling_stddev_oz,
        severity = case
          -- Enough baseline data: use Z-score
          when vb.sample_count >= 4 and vb.rolling_stddev_oz > 0 then
            case
              when (abs(vf.variance_oz) - vb.rolling_mean_oz) / vb.rolling_stddev_oz >= 3 then 'high'
              when (abs(vf.variance_oz) - vb.rolling_mean_oz) / vb.rolling_stddev_oz >= 2 then 'medium'
              when (abs(vf.variance_oz) - vb.rolling_mean_oz) / vb.rolling_stddev_oz >= 1 then 'low'
              else 'none'
            end
          -- Not enough data: keep % threshold fallback
          else
            case
              when vf.variance_pct >= 0.15 then 'high'
              when vf.variance_pct >= 0.10 then 'medium'
              when vf.variance_pct >= 0.05 then 'low'
              else 'none'
            end
        end
      from variance_baselines vb
      where vb.inventory_item_id = vf.inventory_item_id
        and vb.location_id       = vf.location_id
        and vb.tenant_id         = vf.tenant_id
        and vf.week_start_date = (
          select max(week_start_date) from variance_flags vf2
          where vf2.inventory_item_id = vf.inventory_item_id
            and vf2.location_id = vf.location_id
        )
        and (${tenantId}::uuid is null or vf.tenant_id = ${tenantId})
        and (${locationId}::uuid is null or vf.location_id = ${locationId});
    `;

    await sql`
      update job_runs set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;
    console.info("compute-variance done");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await sql`
      update job_runs set status = 'failed', finished_at = now(), details = ${message}
      where id = ${jobRun.id}
    `;
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

run().catch((error) => {
  console.error("compute-variance failed", error);
  process.exit(1);
});
