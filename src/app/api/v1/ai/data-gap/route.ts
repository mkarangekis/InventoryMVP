import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackDataGap } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateDataGap } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiDataGap } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

const daysAgo = (count: number) => {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return d.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiDataGap);
  if (!aiFeatureFlags.dataGap()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackDataGap("No locations available for data gap analysis."));
  }

  const since = daysAgo(30);

  const vendorPromise = scope.tenantId
    ? supabaseAdmin.from("vendors").select("id").in("tenant_id", [scope.tenantId])
    : Promise.resolve({ data: [] as { id: string }[] });

  const [orders, specs, snapshots, forecasts, vendors, ctx] = await Promise.all([
    supabaseAdmin.from("pos_orders").select("id").in("location_id", scope.scopedLocationIds).gte("closed_at", since),
    supabaseAdmin.from("drink_specs").select("id").in("location_id", scope.scopedLocationIds).eq("active", 1),
    supabaseAdmin.from("inventory_snapshots").select("id").in("location_id", scope.scopedLocationIds).gte("snapshot_date", since),
    supabaseAdmin.from("demand_forecasts_daily").select("id,method").in("location_id", scope.scopedLocationIds).gte("forecast_date", since).limit(5),
    vendorPromise,
    buildInsightContext({
      tenantId: scope.tenantId,
      locationId: scope.locationId ?? scope.scopedLocationIds[0],
      locationIds: scope.scopedLocationIds,
    }),
  ]);

  const forecastMethods = Array.from(new Set((forecasts.data ?? []).map((f: { method?: string }) => f.method ?? "unknown")));
  const snapshotsPerMonth = (snapshots.data ?? []).length;

  const input = {
    recent_orders: (orders.data ?? []).length,
    active_specs: (specs.data ?? []).length,
    inventory_counts_30d: snapshotsPerMonth,
    forecast_method: forecastMethods.join(", ") || "none",
    vendors: (vendors.data ?? []).length,
    location_name: ctx.location_name,
    has_events_table: ctx.upcoming_events.length > 0,
    items_with_variance_baselines: ctx.item_trends.filter((t) => t.rolling_mean_oz > 0).length,
    items_flagged_no_baseline: ctx.item_trends.filter((t) => t.rolling_mean_oz === 0).length,
    has_ingredient_costs: ctx.item_trends.filter((t) => t.cost_per_oz !== null).length > 0,
  };

  const userPrompt = `
Identify data gaps that are limiting forecast accuracy and variance detection quality for ${ctx.location_name}.

CURRENT DATA HEALTH:
${JSON.stringify(input, null, 2)}

CONTEXT:
- Items with worsening variance trend: ${ctx.item_trends.filter((t) => t.trend_direction === "worsening").length}
- Items missing cost data (can't calculate shrinkage $): ${ctx.item_trends.filter((t) => t.cost_per_oz === null).length}
- Upcoming events configured: ${ctx.upcoming_events.length}

Focus on gaps with the highest ROI — i.e., what data would most improve the AI's ability to catch issues earlier or forecast more accurately?
  `.trim();

  const response = await runAiFeature({
    feature: "data_gap",
    system: systemPrompts.dataGap,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["gap", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(","), since],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateDataGap,
    fallback: () => fallbackDataGap("Data gap advisor is unavailable right now. Please try again later."),
  });

  return Response.json(response);
}
