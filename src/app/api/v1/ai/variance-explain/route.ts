import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackVarianceExplain } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateVarianceExplain } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiVarianceExplain } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiVarianceExplain);
  if (!aiFeatureFlags.varianceExplain()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackVarianceExplain("No locations available for variance analysis."));
  }

  // Pull variance flags
  const flags = await supabaseAdmin
    .from("variance_flags")
    .select("inventory_item_id,variance_pct,expected_remaining_oz,actual_remaining_oz,severity,week_start_date,location_id,z_score")
    .in("location_id", scope.scopedLocationIds)
    .order("week_start_date", { ascending: false })
    .limit(25);

  if (flags.error) {
    return Response.json(fallbackVarianceExplain("Unable to load variance data."));
  }

  const itemIds = Array.from(new Set((flags.data ?? []).map((r) => r.inventory_item_id)));
  if (itemIds.length === 0) {
    return Response.json(
      fallbackVarianceExplain("No variance flags yet. Connect POS and complete inventory counts to see insights."),
    );
  }

  const items = await supabaseAdmin
    .from("inventory_items")
    .select("id,name_override,ingredient_id")
    .in("id", itemIds);

  const ingredientIds = Array.from(new Set((items.data ?? []).map((r) => r.ingredient_id)));
  const ingredients = ingredientIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name").in("id", ingredientIds)
    : { data: [] };

  const ingMap = new Map((ingredients.data ?? []).map((r) => [r.id, r.name]));
  const itemMap = new Map(
    (items.data ?? []).map((r) => [r.id, r.name_override || ingMap.get(r.ingredient_id) || "Unknown"]),
  );

  // Build rich context
  const ctx = await buildInsightContext({
    tenantId: scope.tenantId,
    locationId: scope.locationId ?? scope.scopedLocationIds[0],
    locationIds: scope.scopedLocationIds,
  });

  const flagInput = (flags.data ?? []).map((flag) => ({
    item: itemMap.get(flag.inventory_item_id) ?? "Unknown",
    variance_pct: Number(flag.variance_pct ?? 0),
    z_score: flag.z_score !== null ? Number(flag.z_score) : null,
    expected_remaining_oz: Number(flag.expected_remaining_oz ?? 0),
    actual_remaining_oz: Number(flag.actual_remaining_oz ?? 0),
    severity: flag.severity ?? "low",
    week_start_date: flag.week_start_date,
  }));

  // Find matching trend context for flagged items
  const trendContext = ctx.item_trends.filter((t) =>
    itemIds.some((id) => t.inventory_item_id === id),
  );

  const userPrompt = `
Analyze these variance flags for ${ctx.location_name} as of ${ctx.as_of_date}.

VARIANCE FLAGS (most recent):
${JSON.stringify(flagInput, null, 2)}

8-WEEK TREND CONTEXT (per item):
${JSON.stringify(trendContext.slice(0, 10), null, 2)}

REVENUE CONTEXT:
- Last 7 days: $${ctx.revenue_last_7d?.toFixed(2) ?? "N/A"}
- Previous 7 days: $${ctx.revenue_prev_7d?.toFixed(2) ?? "N/A"}
- Delta: ${ctx.revenue_delta_pct !== null ? `${ctx.revenue_delta_pct}%` : "N/A"}
- Estimated total weekly shrinkage cost: $${ctx.total_shrinkage_usd?.toFixed(2) ?? "unknown"}

UPCOMING EVENTS (next 14 days):
${ctx.upcoming_events.length ? JSON.stringify(ctx.upcoming_events) : "None scheduled"}

Generate actionable variance explanations. For items with worsening trends, flag them as higher priority.
  `.trim();

  const response = await runAiFeature({
    feature: "variance_explain",
    system: systemPrompts.varianceExplain,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["variance", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(",")],
    cacheTtlMs: 30 * 60_000,
    inputHash: hashInput({ flagInput, ctx: ctx.as_of_date }),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateVarianceExplain,
    fallback: () => fallbackVarianceExplain("Variance insights are unavailable right now. Please try again later."),
  });

  return Response.json(response);
}
