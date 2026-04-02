/**
 * compute-forecast-nixtla.ts  (Phase 1)
 *
 * Replaces the SQL day-of-week baseline with Nixtla TimeGPT.
 * Falls back to the original dow_baseline SQL method if Nixtla API is unavailable.
 *
 * Usage:
 *   pnpm tsx jobs/compute-forecast-nixtla.ts [--tenant=UUID] [--location=UUID] [--date=YYYY-MM-DD]
 *
 * Env vars required:
 *   NIXTLA_API_KEY   — from timegpt.ai
 *   DATABASE_URL     — Postgres connection string
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
const nixtlaApiKey = env.NIXTLA_API_KEY || process.env.NIXTLA_API_KEY;

if (!databaseUrl) { console.error("DATABASE_URL is not set"); process.exit(1); }

const args = process.argv.slice(2);
const argMap = new Map<string, string>();
for (const arg of args) {
  const [key, value] = arg.replace(/^--/, "").split("=");
  if (key && value) argMap.set(key, value);
}

const runDate   = argMap.get("date")     ?? new Date().toISOString().slice(0, 10);
const tenantId  = argMap.get("tenant")   ?? null;
const locationId = argMap.get("location") ?? null;

const HORIZON_DAYS = 14;
const HISTORY_DAYS = 90; // Feed 90 days of history to TimeGPT

const sql = postgres(databaseUrl, { prepare: false });

type NixtlaRow = { unique_id: string; ds: string; y: number };
type NixtlaPrediction = { unique_id: string; ds: string; TimeGPT: number; "TimeGPT-lo-80"?: number; "TimeGPT-hi-80"?: number; "TimeGPT-lo-95"?: number; "TimeGPT-hi-95"?: number };
type NixtlaEvent = { unique_id: string; ds: string; [key: string]: string | number };

async function callNixtla(
  df: NixtlaRow[],
  horizon: number,
  events?: NixtlaEvent[],
): Promise<NixtlaPrediction[]> {
  const url = "https://api.nixtla.io/timegpt";
  const body: Record<string, unknown> = {
    fh: horizon,
    df,
    freq: "D",
    finetune_steps: 0,
    level: [80, 95],
    clean_ex_first: true,
  };
  if (events && events.length > 0) {
    body.x_df = events;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${nixtlaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nixtla API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { data?: { forecast?: { data?: NixtlaPrediction[] } } };
  return data?.data?.forecast?.data ?? [];
}

async function runDowFallback() {
  console.warn("Falling back to dow_baseline SQL method");
  await sql`
    delete from demand_forecasts_daily
    where forecast_date between ${runDate}::date and (${runDate}::date + interval '13 days')
      and (${tenantId}::uuid is null or tenant_id = ${tenantId})
      and (${locationId}::uuid is null or location_id = ${locationId});
  `;

  await sql`
    with history as (
      select ii.id as inventory_item_id, tud.location_id, tud.tenant_id, tud.usage_date, sum(tud.ounces_used) as ounces_used
      from theoretical_usage_daily tud
      join inventory_items ii on ii.ingredient_id = tud.ingredient_id and ii.location_id = tud.location_id and ii.tenant_id = tud.tenant_id
      where tud.usage_date >= ${runDate}::date - interval '56 days'
        and tud.usage_date < ${runDate}::date
        and (${tenantId}::uuid is null or tud.tenant_id = ${tenantId})
        and (${locationId}::uuid is null or tud.location_id = ${locationId})
      group by ii.id, tud.location_id, tud.tenant_id, tud.usage_date
    ),
    weekday_stats as (
      select inventory_item_id, location_id, tenant_id, extract(dow from usage_date) as dow, avg(ounces_used) as avg_oz, count(*) as day_count
      from history group by inventory_item_id, location_id, tenant_id, extract(dow from usage_date)
    ),
    overall_stats as (select inventory_item_id, location_id, tenant_id, avg(ounces_used) as avg_oz from history group by inventory_item_id, location_id, tenant_id),
    forecast_dates as (select (${runDate}::date + gs.day)::date as forecast_date from generate_series(0, 13) as gs(day)),
    expanded as (
      select os.tenant_id, os.location_id, os.inventory_item_id, fd.forecast_date,
        ws.avg_oz as weekday_avg, ws.day_count, os.avg_oz as overall_avg, extract(dow from fd.forecast_date) as dow
      from overall_stats os
      cross join forecast_dates fd
      left join weekday_stats ws on ws.inventory_item_id = os.inventory_item_id and ws.location_id = os.location_id and ws.tenant_id = os.tenant_id and ws.dow = extract(dow from fd.forecast_date)
    )
    insert into demand_forecasts_daily (tenant_id, location_id, forecast_date, inventory_item_id, forecast_usage_oz, method, computed_at)
    select tenant_id, location_id, forecast_date, inventory_item_id,
      case when coalesce(day_count, 0) >= 3 then weekday_avg else overall_avg end,
      'dow_baseline', now()
    from expanded;
  `;
}

const run = async () => {
  console.info("compute-forecast-nixtla start", { runDate, tenantId, locationId });

  const [jobRun] = await sql`
    insert into job_runs (tenant_id, location_id, job_name, status)
    values (${tenantId}, ${locationId}, 'compute-forecast-nixtla', 'running')
    returning id
  `;

  try {
    if (!nixtlaApiKey) {
      console.warn("NIXTLA_API_KEY not set — using dow_baseline fallback");
      await runDowFallback();
    } else {
      // Pull 90 days of daily usage history per inventory item
      const history = await sql`
        select
          ii.id                       as inventory_item_id,
          tud.location_id,
          tud.tenant_id,
          tud.usage_date::text        as ds,
          sum(tud.ounces_used)::float as y
        from theoretical_usage_daily tud
        join inventory_items ii
          on ii.ingredient_id = tud.ingredient_id
          and ii.location_id  = tud.location_id
          and ii.tenant_id    = tud.tenant_id
        where tud.usage_date >= ${runDate}::date - interval '${sql.unsafe(String(HISTORY_DAYS))} days'
          and tud.usage_date < ${runDate}::date
          and (${tenantId}::uuid is null or tud.tenant_id = ${tenantId})
          and (${locationId}::uuid is null or tud.location_id = ${locationId})
        group by ii.id, tud.location_id, tud.tenant_id, tud.usage_date
        order by tud.usage_date
      `;

      if (history.length === 0) {
        console.warn("No history rows found — using dow_baseline fallback");
        await runDowFallback();
      } else {
        // Pull upcoming events to use as exogenous variables
        const events = await sql`
          select
            concat(location_id::text, '_', ${runDate}) as unique_id,
            event_date::text as ds,
            coalesce(impact_pct, 0)::float as impact_pct
          from location_events
          where event_date between ${runDate}::date and (${runDate}::date + interval '${sql.unsafe(String(HORIZON_DAYS))} days')
            and (${tenantId}::uuid is null or tenant_id = ${tenantId})
            and (${locationId}::uuid is null or location_id = ${locationId})
        `;

        // Group history by item×location as separate time series
        type SeriesKey = { itemId: string; locationId: string; tenantId: string };
        const seriesMap = new Map<string, { key: SeriesKey; rows: NixtlaRow[] }>();
        for (const row of history) {
          const key = `${row.inventory_item_id}__${row.location_id}`;
          if (!seriesMap.has(key)) {
            seriesMap.set(key, { key: { itemId: row.inventory_item_id, locationId: row.location_id, tenantId: row.tenant_id }, rows: [] });
          }
          seriesMap.get(key)!.rows.push({ unique_id: key, ds: row.ds, y: Number(row.y) });
        }

        // Only forecast series with enough history (≥14 data points)
        const qualifiedSeries = Array.from(seriesMap.values()).filter((s) => s.rows.length >= 14);
        console.info(`Forecasting ${qualifiedSeries.length} series via TimeGPT (${seriesMap.size - qualifiedSeries.length} skipped — insufficient history)`);

        if (qualifiedSeries.length === 0) {
          await runDowFallback();
        } else {
          // Batch up to 200 series per Nixtla call
          const BATCH = 200;
          const allForecasts: NixtlaPrediction[] = [];
          for (let i = 0; i < qualifiedSeries.length; i += BATCH) {
            const batch = qualifiedSeries.slice(i, i + BATCH);
            const df: NixtlaRow[] = batch.flatMap((s) => s.rows);
            const nixtlaEvents: NixtlaEvent[] = events.map((e) => ({ unique_id: String(e.unique_id), ds: String(e.ds), impact_pct: Number(e.impact_pct) }));
            try {
              const preds = await callNixtla(df, HORIZON_DAYS, nixtlaEvents.length ? nixtlaEvents : undefined);
              allForecasts.push(...preds);
            } catch (err) {
              console.error(`Nixtla batch ${i / BATCH + 1} failed:`, err);
              // Continue without this batch — fallback for those items happens on insert below
            }
          }

          // Build a map for quick lookup
          const forecastMap = new Map<string, NixtlaPrediction[]>();
          for (const pred of allForecasts) {
            const arr = forecastMap.get(pred.unique_id) ?? [];
            arr.push(pred);
            forecastMap.set(pred.unique_id, arr);
          }

          // Delete existing forecast rows for this window
          await sql`
            delete from demand_forecasts_daily
            where forecast_date between ${runDate}::date and (${runDate}::date + interval '${sql.unsafe(String(HORIZON_DAYS - 1))} days')
              and (${tenantId}::uuid is null or tenant_id = ${tenantId})
              and (${locationId}::uuid is null or location_id = ${locationId});
          `;

          // Upsert TimeGPT forecasts
          const insertRows: {
            tenant_id: string; location_id: string; inventory_item_id: string;
            forecast_date: string; forecast_usage_oz: number; method: string;
            lo_80: number | null; hi_80: number | null; lo_95: number | null; hi_95: number | null;
            computed_at: string;
          }[] = [];

          for (const series of qualifiedSeries) {
            const key = `${series.key.itemId}__${series.key.locationId}`;
            const preds = forecastMap.get(key);
            if (!preds || preds.length === 0) continue;
            for (const pred of preds) {
              insertRows.push({
                tenant_id: series.key.tenantId,
                location_id: series.key.locationId,
                inventory_item_id: series.key.itemId,
                forecast_date: pred.ds,
                forecast_usage_oz: Math.max(0, pred.TimeGPT),
                method: "timegpt",
                lo_80: pred["TimeGPT-lo-80"] ?? null,
                hi_80: pred["TimeGPT-hi-80"] ?? null,
                lo_95: pred["TimeGPT-lo-95"] ?? null,
                hi_95: pred["TimeGPT-hi-95"] ?? null,
                computed_at: new Date().toISOString(),
              });
            }
          }

          if (insertRows.length > 0) {
            await sql`
              insert into demand_forecasts_daily ${sql(insertRows)}
              on conflict do nothing;
            `;
            console.info(`Inserted ${insertRows.length} TimeGPT forecast rows`);
          }

          // Fallback dow_baseline for series that didn't get forecasted
          const forecastedItemIds = new Set(insertRows.map((r) => `${r.inventory_item_id}__${r.location_id}`));
          const missing = qualifiedSeries.filter((s) => !forecastedItemIds.has(`${s.key.itemId}__${s.key.locationId}`));
          if (missing.length > 0) {
            console.warn(`${missing.length} series fell back to dow_baseline`);
            // Their dow_baseline entries were deleted above; run partial fallback
            await runDowFallback();
          }
        }
      }
    }

    await sql`update job_runs set status = 'completed', finished_at = now() where id = ${jobRun.id}`;
    console.info("compute-forecast-nixtla done");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await sql`update job_runs set status = 'failed', finished_at = now(), details = ${message} where id = ${jobRun.id}`;
    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

run().catch((error) => {
  console.error("compute-forecast-nixtla failed", error);
  process.exit(1);
});
