import { getUserScope } from "@/ai/context";
import { runAiFeature, hashInput } from "@/ai/run";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { scoreMarginEngineering } from "@/lib/ai/margin-engineering";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.scopedLocationIds.length === 0) {
    return Response.json({ opportunities: [], error: "No locations available." });
  }

  const locationId = scope.locationId ?? scope.scopedLocationIds[0] ?? "";
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [menuItems, orderItems, specs, ingredientCosts, ctx] = await Promise.all([
    supabaseAdmin
      .from("menu_items")
      .select("id,name,base_price,category,location_id")
      .in("location_id", scope.scopedLocationIds),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity,gross")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since30),
    supabaseAdmin
      .from("drink_specs")
      .select("id,menu_item_id")
      .eq("active", 1)
      .in("location_id", scope.scopedLocationIds),
    supabaseAdmin
      .from("ingredient_costs")
      .select("ingredient_id,cost_per_oz")
      .eq("tenant_id", scope.tenantId ?? "")
      .is("effective_to", null),
    buildInsightContext({ tenantId: scope.tenantId, locationId, locationIds: scope.scopedLocationIds }),
  ]);

  const specIds = (specs.data ?? []).map((s) => s.id);
  const specLines = specIds.length
    ? await supabaseAdmin
        .from("drink_spec_lines")
        .select("drink_spec_id,ingredient_id,ounces")
        .in("drink_spec_id", specIds)
    : { data: [] };

  // Resolve ingredient names
  const ingIds = Array.from(new Set((specLines.data ?? []).map((l) => l.ingredient_id)));
  const ings = ingIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name,type").in("id", ingIds)
    : { data: [] };
  const ingNameMap = new Map((ings.data ?? []).map((g) => [g.id, g.name]));

  const costMap = new Map((ingredientCosts.data ?? []).map((c) => [c.ingredient_id, Number(c.cost_per_oz)]));

  // Build spec lines per menu item
  const menuSpecLinesMap = new Map<string, { ingredient_name: string; ounces: number; cost_per_oz: number }[]>();
  for (const spec of specs.data ?? []) {
    const lines = (specLines.data ?? [])
      .filter((l) => l.drink_spec_id === spec.id)
      .map((l) => ({
        ingredient_name: ingNameMap.get(l.ingredient_id) ?? "Unknown",
        ounces: Number(l.ounces),
        cost_per_oz: costMap.get(l.ingredient_id) ?? 0,
      }));
    if (!menuSpecLinesMap.has(spec.menu_item_id)) {
      menuSpecLinesMap.set(spec.menu_item_id, lines);
    }
  }

  // Build sales map
  const salesMap = new Map<string, { qty: number; revenue: number }>();
  for (const row of orderItems.data ?? []) {
    const e = salesMap.get(row.menu_item_id) ?? { qty: 0, revenue: 0 };
    e.qty += Number(row.quantity ?? 0);
    e.revenue += Number(row.gross ?? 0);
    salesMap.set(row.menu_item_id, e);
  }

  // Build variance map for primary spirit over-pour detection
  const varianceMap = new Map<string, number>();
  for (const trend of ctx.item_trends) {
    if (trend.variance_8w[0]) {
      varianceMap.set(trend.item.toLowerCase(), trend.variance_8w[0].variance_pct);
    }
  }

  // Score each menu item with a spec
  const opportunities = [];
  for (const item of menuItems.data ?? []) {
    const lines = menuSpecLinesMap.get(item.id);
    if (!lines || lines.length === 0) continue;

    const sales = salesMap.get(item.id);
    const qty30 = sales?.qty ?? 0;
    const revenue = sales?.revenue ?? 0;
    const price = qty30 > 0 ? revenue / qty30 : Number(item.base_price ?? 0);
    if (price === 0) continue;

    // Check variance for primary spirit (highest oz ingredient)
    const primarySpirit = lines.sort((a, b) => b.ounces - a.ounces)[0];
    const variancePct = primarySpirit ? varianceMap.get(primarySpirit.ingredient_name.toLowerCase()) ?? null : null;

    const opp = scoreMarginEngineering(item.name, price, lines, qty30, variancePct);
    if (opp.opportunity_type !== "at_target") {
      opportunities.push(opp);
    }
  }

  // Sort by monthly impact descending
  opportunities.sort((a, b) => b.monthly_impact_usd - a.monthly_impact_usd);

  const totalMonthlyImpact = opportunities.reduce((s, o) => s + o.monthly_impact_usd, 0);

  if (opportunities.length === 0) {
    return Response.json({
      opportunities: [],
      summary: "All your recipes are already well-engineered. No significant margin opportunities found.",
      recommendations: [],
      total_monthly_impact: 0,
    });
  }

  const userPrompt = `
Recipe and margin analysis for ${ctx.location_name}.

MARGIN OPPORTUNITIES (items below 70% target margin):
${JSON.stringify(opportunities.slice(0, 12), null, 2)}

TOTAL MONTHLY MARGIN IMPROVEMENT POTENTIAL: $${totalMonthlyImpact.toFixed(2)}

For each item:
1. Explain the problem in plain English (e.g., "Your Margarita costs $4.80 to make but you charge $10 — that's only 52% margin")
2. Give a specific fix: reduce pour size, adjust spec, raise price, or enforce jigger use
3. Quantify the monthly impact
4. Flag any over-pouring issues (high variance + high cost ingredient = bartender training needed)

Write for a bar owner. Be direct and actionable.
`.trim();

  const response = await runAiFeature({
    feature: "margin_engineering",
    system: `You are Pourdex AI, an expert bar operations and cost consultant.
Schema: {
  recommendations: [{
    drink: string,
    problem: string,
    fix: string,
    fix_type: "reduce_pour"|"adjust_spec"|"raise_price"|"enforce_jigger"|"substitute",
    monthly_impact_usd: number,
    current_margin_pct: number,
    target_margin_pct: number,
    priority: "low"|"med"|"high"
  }],
  summary: string,
  total_monthly_impact: number
}
Return ONLY valid JSON.`,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["margin_engineering", scope.tenantId, locationId, since30],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput({ opp_count: opportunities.length, total_impact: Math.round(totalMonthlyImpact) }),
    tenantId: scope.tenantId,
    locationId,
    userId: scope.userId,
    validate: (v: unknown) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      if (!Array.isArray(o.recommendations)) return null;
      return o as { recommendations: unknown[]; summary: string; total_monthly_impact: number };
    },
    fallback: () => ({ recommendations: [], summary: "Margin analysis unavailable right now.", total_monthly_impact: 0 }),
  });

  return Response.json({ ...response, opportunities: opportunities.slice(0, 20), total_monthly_impact: totalMonthlyImpact });
}
