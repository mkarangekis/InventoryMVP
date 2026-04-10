import { getUserScope } from "@/ai/context";
import { runAiFeature, hashInput } from "@/ai/run";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { buildSeasonalContext } from "@/lib/ai/seasonal-specials";
import { demoAiSeasonalSpecials } from "@/lib/demo";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiSeasonalSpecials);

  if (scope.scopedLocationIds.length === 0) {
    return Response.json({ specials: [], error: "No locations available." });
  }

  const locationId = scope.locationId ?? scope.scopedLocationIds[0] ?? "";
  const seasonCtx = buildSeasonalContext();

  // Get overstocked items (high positive variance = more on hand than expected)
  const [inventoryItems, ingredientCosts, ctx] = await Promise.all([
    supabaseAdmin
      .from("inventory_items")
      .select("id,name_override,ingredient_id,container_size_oz")
      .in("location_id", scope.scopedLocationIds)
      .eq("is_active", 1)
      .limit(100),
    supabaseAdmin
      .from("ingredient_costs")
      .select("ingredient_id,cost_per_oz")
      .eq("tenant_id", scope.tenantId ?? "")
      .is("effective_to", null),
    buildInsightContext({ tenantId: scope.tenantId, locationId, locationIds: scope.scopedLocationIds }),
  ]);

  const costMap = new Map((ingredientCosts.data ?? []).map((c) => [c.ingredient_id, Number(c.cost_per_oz)]));

  // Items with positive variance (overstocked) are prime candidates for specials
  const overstockedItems = ctx.item_trends
    .filter((t) => (t.variance_8w[0]?.variance_pct ?? 0) > 0.05)
    .map((t) => ({
      name: t.item,
      type: t.ingredient_type,
      overstock_pct: t.variance_8w[0]?.variance_pct,
      cost_per_oz: t.cost_per_oz,
    }));

  // Also pull top-margin ingredients from inventory
  const ingredients = (inventoryItems.data ?? []).map((item) => ({
    id: item.id,
    name: item.name_override,
    cost_per_oz: costMap.get(item.ingredient_id) ?? 0,
  })).filter((i) => i.cost_per_oz > 0).slice(0, 20);

  const userPrompt = `
Create seasonal drink specials for ${ctx.location_name}.

CURRENT SEASON: ${seasonCtx.season.toUpperCase()}${seasonCtx.holiday_label ? ` (${seasonCtx.holiday_label} window)` : ""}
FLAVOR PROFILES trending now: ${seasonCtx.flavor_profiles.join(", ")}
TRENDING SPIRITS: ${seasonCtx.trending_spirits.join(", ")}
OCCASION GUIDANCE: ${seasonCtx.occasion_notes}

OVERSTOCKED INGREDIENTS (these need to move — ideal for specials):
${JSON.stringify(overstockedItems.slice(0, 8), null, 2)}

AVAILABLE INVENTORY (for cross-referencing):
${JSON.stringify(ingredients.slice(0, 15), null, 2)}

REVENUE CONTEXT: Last 7 days $${ctx.revenue_last_7d?.toFixed(0) ?? "N/A"}

Generate 4–5 seasonal specials that:
1. Use at least one overstocked ingredient where possible
2. Match the season's flavor profile and trending spirits
3. Have a compelling, memorable name
4. Are simple enough to train a bartender in 5 minutes
5. Include a target price that achieves ≥70% margin
6. Include a 1-sentence bartender pitch script

Be specific. Give real recipe ingredients and quantities.
`.trim();

  const response = await runAiFeature({
    feature: "seasonal_specials",
    system: `You are Pourdex AI, an expert bar menu developer and mixologist.
Schema: {
  specials: [{
    name: string,
    tagline: string,
    ingredients: [{ingredient: string, amount: string}],
    suggested_price: number,
    estimated_cost: number,
    estimated_margin_pct: number,
    uses_overstock: boolean,
    bartender_pitch: string,
    seasonal_reason: string
  }],
  season: string,
  holiday_window: string | null
}
Return ONLY valid JSON.`,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["seasonal_specials", scope.tenantId, locationId, seasonCtx.season, seasonCtx.holiday_window],
    cacheTtlMs: 24 * 60 * 60_000,
    inputHash: hashInput({ season: seasonCtx.season, holiday: seasonCtx.holiday_window, overstock_count: overstockedItems.length }),
    tenantId: scope.tenantId,
    locationId,
    userId: scope.userId,
    validate: (v: unknown) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      if (!Array.isArray(o.specials)) return null;
      return o as { specials: unknown[]; season: string; holiday_window: string | null };
    },
    fallback: () => ({ specials: [], season: seasonCtx.season, holiday_window: seasonCtx.holiday_window ?? null }),
  });

  return Response.json({ ...response, seasonal_context: seasonCtx });
}
