/**
 * RAG Context Engine — buildInsightContext()
 *
 * Pulls structured historical signals from Supabase and assembles a rich
 * context payload that gets injected into every AI prompt. This is the
 * difference between "AI generic advice" and "AI that knows your bar."
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ItemTrend = {
  item: string;
  inventory_item_id: string;
  ingredient_type: string | null;
  variance_8w: { week: string; variance_pct: number; z_score: number | null }[];
  rolling_mean_oz: number;
  rolling_stddev_oz: number;
  trend_direction: "improving" | "worsening" | "stable" | "new";
  cost_per_oz: number | null;
  estimated_weekly_shrinkage_usd: number | null;
};

export type InsightContext = {
  location_name: string;
  timezone: string;
  as_of_date: string;
  // 8-week variance trends per flagged item
  item_trends: ItemTrend[];
  // Revenue context
  revenue_last_7d: number | null;
  revenue_prev_7d: number | null;
  revenue_delta_pct: number | null;
  // Top selling items (for upsell / shift push context)
  top_selling_items: { name: string; qty_sold: number; price: number; category: string | null }[];
  // Upcoming events that affect demand
  upcoming_events: { event_date: string; event_name: string; event_type: string; impact_pct: number | null }[];
  // Comparable items by category (for cross-item context)
  category_summary: { category: string; item_count: number; avg_variance_pct: number }[];
  // Total estimated shrinkage cost across all flagged items
  total_shrinkage_usd: number | null;
  // Weather context for demand elasticity
  weather_forecast: {
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    precipitation_mm: number;
    weather_code: number;
    description: string;
  }[] | null;
};

type ContextOptions = {
  tenantId: string | null;
  locationId: string;
  locationIds?: string[]; // for multi-location queries
};

export async function buildInsightContext(opts: ContextOptions): Promise<InsightContext> {
  const tenantId = opts.tenantId ?? "";
  const locationId = opts.locationId;
  const locationIds = opts.locationIds ?? [locationId];

  // Run all queries in parallel
  const [
    locationResult,
    varianceTrendResult,
    baselinesResult,
    revenueResult,
    topItemsResult,
    eventsResult,
    ingredientCostsResult,
  ] = await Promise.allSettled([
    // 1. Location info
    supabaseAdmin
      .from("locations")
      .select("name, timezone, address")
      .eq("id", locationId)
      .single(),

    // 2. 8-week variance flag history per item
    supabaseAdmin
      .from("variance_flags")
      .select("inventory_item_id, week_start_date, variance_pct, z_score, severity")
      .in("location_id", locationIds)
      .eq("tenant_id", tenantId)
      .order("week_start_date", { ascending: false })
      .limit(200),

    // 3. Variance baselines (rolling stats)
    supabaseAdmin
      .from("variance_baselines")
      .select("inventory_item_id, rolling_mean_oz, rolling_stddev_oz, trend_slope, sample_count")
      .in("location_id", locationIds)
      .eq("tenant_id", tenantId),

    // 4. Revenue last 14 days
    supabaseAdmin
      .from("pos_orders")
      .select("closed_at, total")
      .in("location_id", locationIds)
      .eq("tenant_id", tenantId)
      .gte("closed_at", new Date(Date.now() - 14 * 86400_000).toISOString())
      .eq("status", "closed"),

    // 5. Top selling menu items last 7 days
    supabaseAdmin
      .from("pos_order_items")
      .select("name, quantity, price_each, menu_item_id")
      .in("location_id", locationIds)
      .eq("tenant_id", tenantId)
      .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .limit(500),

    // 6. Upcoming events (next 14 days)
    supabaseAdmin
      .from("location_events")
      .select("event_date, event_name, event_type, impact_pct")
      .in("location_id", locationIds)
      .eq("tenant_id", tenantId)
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .lte("event_date", new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10))
      .order("event_date"),

    // 7. Latest ingredient costs
    supabaseAdmin
      .from("ingredient_costs")
      .select("ingredient_id, cost_per_oz")
      .eq("tenant_id", tenantId)
      .is("effective_to", null)
      .limit(500),
  ]);

  // ── Location ──────────────────────────────────────────────────────────────
  const locationData = locationResult.status === "fulfilled"
    ? locationResult.value.data as { name: string; timezone: string; address: string } | null
    : null;

  // ── Revenue ───────────────────────────────────────────────────────────────
  let revenue7d: number | null = null;
  let revenuePrev7d: number | null = null;
  let revenueDeltaPct: number | null = null;
  if (revenueResult.status === "fulfilled" && revenueResult.value.data) {
    const cutoff7 = Date.now() - 7 * 86400_000;
    const cutoff14 = Date.now() - 14 * 86400_000;
    const orders = revenueResult.value.data;
    revenue7d = orders
      .filter((o) => new Date(o.closed_at).getTime() >= cutoff7)
      .reduce((s, o) => s + Number(o.total), 0);
    revenuePrev7d = orders
      .filter((o) => {
        const t = new Date(o.closed_at).getTime();
        return t >= cutoff14 && t < cutoff7;
      })
      .reduce((s, o) => s + Number(o.total), 0);
    if (revenuePrev7d > 0) {
      revenueDeltaPct = Math.round(((revenue7d - revenuePrev7d) / revenuePrev7d) * 1000) / 10;
    }
  }

  // ── Variance trends ───────────────────────────────────────────────────────
  const varianceRows = varianceTrendResult.status === "fulfilled"
    ? (varianceTrendResult.value.data ?? [])
    : [];

  const baselines = baselinesResult.status === "fulfilled"
    ? (baselinesResult.value.data ?? [])
    : [];
  const baselineMap = new Map(baselines.map((b) => [b.inventory_item_id, b]));

  const costs = ingredientCostsResult.status === "fulfilled"
    ? (ingredientCostsResult.value.data ?? [])
    : [];
  const costMap = new Map(costs.map((c) => [c.ingredient_id, Number(c.cost_per_oz)]));

  // Get inventory item details for all flagged items
  const flaggedItemIds = Array.from(new Set(varianceRows.map((r) => r.inventory_item_id)));
  let itemMeta: Record<string, { name: string; ingredient_id: string; type: string | null; container_size_oz: number }> = {};
  if (flaggedItemIds.length > 0) {
    const { data: invItems } = await supabaseAdmin
      .from("inventory_items")
      .select("id, name_override, ingredient_id, container_size_oz")
      .in("id", flaggedItemIds);
    const ingIds = Array.from(new Set((invItems ?? []).map((i) => i.ingredient_id)));
    const { data: ings } = ingIds.length
      ? await supabaseAdmin.from("ingredients").select("id, name, type").in("id", ingIds)
      : { data: [] };
    const ingMap = new Map((ings ?? []).map((g) => [g.id, g]));
    for (const item of invItems ?? []) {
      const ing = ingMap.get(item.ingredient_id);
      itemMeta[item.id] = {
        name: item.name_override || ing?.name || "Unknown",
        ingredient_id: item.ingredient_id,
        type: ing?.type ?? null,
        container_size_oz: Number(item.container_size_oz),
      };
    }
  }

  // Group variance rows by item and build trend arrays (last 8 weeks)
  const itemWeeks = new Map<string, { week: string; variance_pct: number; z_score: number | null }[]>();
  for (const row of varianceRows) {
    const arr = itemWeeks.get(row.inventory_item_id) ?? [];
    if (arr.length < 8) {
      arr.push({
        week: row.week_start_date,
        variance_pct: Number(row.variance_pct ?? 0),
        z_score: row.z_score !== null ? Number(row.z_score) : null,
      });
    }
    itemWeeks.set(row.inventory_item_id, arr);
  }

  const item_trends: ItemTrend[] = [];
  let totalShrinkageUsd = 0;
  const categoryCounts: Record<string, { count: number; totalVar: number }> = {};

  for (const [itemId, weeks] of itemWeeks) {
    const meta = itemMeta[itemId];
    const baseline = baselineMap.get(itemId);
    const costPerOz = meta?.ingredient_id ? costMap.get(meta.ingredient_id) ?? null : null;

    // Trend direction: compare first 4 weeks avg vs last 4 weeks avg
    let trendDirection: ItemTrend["trend_direction"] = "new";
    if (weeks.length >= 4) {
      const recent = weeks.slice(0, 4).reduce((s, w) => s + w.variance_pct, 0) / 4;
      const older  = weeks.slice(-4).reduce((s, w) => s + w.variance_pct, 0) / 4;
      const delta = recent - older;
      trendDirection = delta > 0.02 ? "worsening" : delta < -0.02 ? "improving" : "stable";
    }

    // Estimate weekly shrinkage cost
    let weeklyShkUsd: number | null = null;
    const weekSample = Math.min(weeks.length, 4);
    if (costPerOz != null && baseline && Number(baseline.rolling_mean_oz) > 0 && weekSample > 0) {
      const avgVarPct = weeks.slice(0, weekSample).reduce((s, w) => s + w.variance_pct, 0) / weekSample;
      weeklyShkUsd = Math.round(Number(baseline.rolling_mean_oz) * avgVarPct * costPerOz * 100) / 100;
      totalShrinkageUsd += weeklyShkUsd;
    }

    // Category summary
    const cat = meta?.type ?? "unknown";
    const avgVarPct = weeks[0]?.variance_pct ?? 0;
    if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, totalVar: 0 };
    categoryCounts[cat].count++;
    categoryCounts[cat].totalVar += avgVarPct;

    item_trends.push({
      item: meta?.name ?? "Unknown",
      inventory_item_id: itemId,
      ingredient_type: meta?.type ?? null,
      variance_8w: weeks,
      rolling_mean_oz: baseline ? Number(baseline.rolling_mean_oz) : 0,
      rolling_stddev_oz: baseline ? Number(baseline.rolling_stddev_oz) : 0,
      trend_direction: trendDirection,
      cost_per_oz: costPerOz,
      estimated_weekly_shrinkage_usd: weeklyShkUsd,
    });
  }

  // Sort by most concerning first: worsening + high z_score
  item_trends.sort((a, b) => {
    const scoreTrend = (t: string) => ({ worsening: 2, stable: 1, new: 0, improving: -1 }[t] ?? 0);
    const aZ = a.variance_8w[0]?.z_score ?? 0;
    const bZ = b.variance_8w[0]?.z_score ?? 0;
    return (scoreTrend(b.trend_direction) + bZ) - (scoreTrend(a.trend_direction) + aZ);
  });

  // ── Top selling items ──────────────────────────────────────────────────────
  const topItemsRaw = topItemsResult.status === "fulfilled" ? (topItemsResult.value.data ?? []) : [];
  const itemSalesMap = new Map<string, { qty: number; price: number; category: string | null }>();
  for (const row of topItemsRaw) {
    const key = row.name;
    const existing = itemSalesMap.get(key) ?? { qty: 0, price: Number(row.price_each), category: null };
    itemSalesMap.set(key, { qty: existing.qty + row.quantity, price: Number(row.price_each), category: null });
  }
  const top_selling_items = Array.from(itemSalesMap.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 15)
    .map(([name, v]) => ({ name, qty_sold: v.qty, price: v.price, category: v.category }));

  // ── Events ────────────────────────────────────────────────────────────────
  const upcoming_events = eventsResult.status === "fulfilled"
    ? (eventsResult.value.data ?? []).map((e) => ({
        event_date: e.event_date,
        event_name: e.event_name,
        event_type: e.event_type,
        impact_pct: e.impact_pct !== null ? Number(e.impact_pct) : null,
      }))
    : [];

  // ── Category summary ──────────────────────────────────────────────────────
  const category_summary = Object.entries(categoryCounts).map(([category, { count, totalVar }]) => ({
    category,
    item_count: count,
    avg_variance_pct: Math.round((totalVar / count) * 1000) / 10,
  }));

  // ── Weather elasticity (Open-Meteo, free, no API key) ────────────────────
  let weather_forecast: InsightContext["weather_forecast"] = null;
  try {
    // Priority: env override → geocode the location address → skip
    let lat: string | null = process.env.LOCATION_LAT ?? null;
    let lng: string | null = process.env.LOCATION_LNG ?? null;

    if ((!lat || !lng) && locationData?.address) {
      // Open-Meteo geocoding — also free, no API key
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationData.address)}&count=1&language=en&format=json`;
      const geoCtrl = new AbortController();
      const geoTimer = setTimeout(() => geoCtrl.abort(), 3000);
      const geoRes = await fetch(geoUrl, { signal: geoCtrl.signal }).finally(() => clearTimeout(geoTimer)).catch(() => null);
      if (geoRes?.ok) {
        const geoData = (await geoRes.json()) as { results?: { latitude: number; longitude: number }[] };
        const first = geoData.results?.[0];
        if (first) { lat = String(first.latitude); lng = String(first.longitude); }
      }
    }

    if (!lat || !lng) throw new Error("No coordinates available");

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&forecast_days=7&timezone=auto`;
    const wCtrl = new AbortController();
    const wTimer = setTimeout(() => wCtrl.abort(), 4000);
    const weatherRes = await fetch(weatherUrl, { signal: wCtrl.signal }).finally(() => clearTimeout(wTimer));
    if (weatherRes.ok) {
      const weatherData = (await weatherRes.json()) as {
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
          weathercode: number[];
        };
      };
      const d = weatherData.daily;
      const WMO_DESC: Record<number, string> = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Light rain", 63: "Rain", 65: "Heavy rain",
        71: "Light snow", 73: "Snow", 75: "Heavy snow",
        80: "Light showers", 81: "Showers", 82: "Heavy showers",
        95: "Thunderstorm", 96: "Thunderstorm+hail", 99: "Severe thunderstorm",
      };
      weather_forecast = d.time.map((date, i) => ({
        date,
        temp_max_c: d.temperature_2m_max[i] ?? 0,
        temp_min_c: d.temperature_2m_min[i] ?? 0,
        precipitation_mm: d.precipitation_sum[i] ?? 0,
        weather_code: d.weathercode[i] ?? 0,
        description: WMO_DESC[d.weathercode[i] ?? 0] ?? "Unknown",
      }));
    }
  } catch {
    // Weather is non-critical; silent fail
  }

  return {
    location_name: locationData?.name ?? "Unknown Location",
    timezone: locationData?.timezone ?? "UTC",
    as_of_date: new Date().toISOString().slice(0, 10),
    item_trends,
    revenue_last_7d: revenue7d,
    revenue_prev_7d: revenuePrev7d,
    revenue_delta_pct: revenueDeltaPct,
    top_selling_items,
    upcoming_events,
    category_summary,
    total_shrinkage_usd: totalShrinkageUsd > 0 ? Math.round(totalShrinkageUsd * 100) / 100 : null,
    weather_forecast,
  };
}
