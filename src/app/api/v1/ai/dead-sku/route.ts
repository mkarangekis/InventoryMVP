import { getUserScope } from "@/ai/context";
import { runAiFeature, hashInput } from "@/ai/run";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { scoreDeadSku } from "@/lib/ai/dead-sku";
import { getSeason } from "@/lib/ai/seasonal-specials";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.scopedLocationIds.length === 0) {
    return Response.json({ dead_skus: [], error: "No locations available." });
  }

  const locationId = scope.locationId ?? scope.scopedLocationIds[0] ?? "";
  const now = new Date();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const since60 = new Date(Date.now() - 60 * 86400_000).toISOString();
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const currentSeason = getSeason(now.getMonth() + 1);

  const [menuItems, orders30, orders60, orders90, specs, ingredientCosts, ctx] = await Promise.all([
    supabaseAdmin
      .from("menu_items")
      .select("id,name,base_price,category,location_id")
      .in("location_id", scope.scopedLocationIds),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since30),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since60),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since90),
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

  // Build sales maps
  const buildSalesMap = (rows: { menu_item_id: string; quantity: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.menu_item_id, (m.get(r.menu_item_id) ?? 0) + Number(r.quantity ?? 0));
    }
    return m;
  };

  const sales30 = buildSalesMap(orders30.data ?? []);
  const sales60 = buildSalesMap(orders60.data ?? []);
  const sales90 = buildSalesMap(orders90.data ?? []);

  // Get spec lines for cost calculation
  const specIds = (specs.data ?? []).map((s) => s.id);
  const specLines = specIds.length
    ? await supabaseAdmin
        .from("drink_spec_lines")
        .select("drink_spec_id,ingredient_id,ounces")
        .in("drink_spec_id", specIds)
    : { data: [] };

  const costMap = new Map((ingredientCosts.data ?? []).map((c) => [c.ingredient_id, Number(c.cost_per_oz)]));
  const specCostMap = new Map<string, number>();
  for (const line of specLines.data ?? []) {
    specCostMap.set(
      line.drink_spec_id,
      (specCostMap.get(line.drink_spec_id) ?? 0) + Number(line.ounces) * (costMap.get(line.ingredient_id) ?? 0),
    );
  }

  const menuSpecMap = new Map<string, number>();
  for (const spec of specs.data ?? []) {
    if (!menuSpecMap.has(spec.menu_item_id)) {
      menuSpecMap.set(spec.menu_item_id, specCostMap.get(spec.id) ?? 0);
    }
  }

  // Score each menu item
  const deadSkus = (menuItems.data ?? []).map((item) => {
    const qty30 = sales30.get(item.id) ?? 0;
    const qty60 = sales60.get(item.id) ?? 0;
    const qty90 = sales90.get(item.id) ?? 0;
    const price = Number(item.base_price ?? 0);
    const cost = menuSpecMap.get(item.id) ?? 0;
    // Rough on-hand estimate: assume 2 weeks of average weekly sales as par
    const weeklyAvg = qty90 > 0 ? qty90 / 13 : 0;
    const estimatedOnHand = Math.max(0, weeklyAvg * 2);

    return scoreDeadSku(item.id, item.name, item.category, price, cost, qty30, qty60, qty90, estimatedOnHand, currentSeason);
  });

  const problematic = deadSkus.filter((s) => s.signal !== "healthy");
  problematic.sort((a, b) => {
    const order = { dead: 0, dying: 1, seasonal_mismatch: 2, healthy: 3 };
    return order[a.signal] - order[b.signal];
  });

  if (problematic.length === 0) {
    return Response.json({
      dead_skus: [],
      summary: "Your menu is clean — all items are selling. No dead SKUs detected.",
      recommendations: [],
      total_carrying_cost_usd: 0,
    });
  }

  const totalCarryingCost = problematic.reduce((s, i) => s + i.monthly_carrying_cost_usd, 0);

  const userPrompt = `
Menu audit for ${ctx.location_name}. Identify which items to cut, which to run as specials, and which to replace.

PROBLEMATIC ITEMS (not selling):
${JSON.stringify(problematic.slice(0, 15), null, 2)}

TOTAL MONTHLY CARRYING COST OF DEAD STOCK: $${totalCarryingCost.toFixed(2)}
CURRENT SEASON: ${currentSeason}

For each item:
1. Give a plain-English recommendation (cut it / run it as a special to clear stock / replace it)
2. If there's inventory on hand, suggest how to use it up (special, staff drink, comp item)
3. If seasonal mismatch, suggest what to replace it with this season
4. Estimate the monthly cost savings of removing it

Write for a bar owner — clear, direct, no jargon.
`.trim();

  const response = await runAiFeature({
    feature: "dead_sku",
    system: `You are Pourdex AI, an expert bar menu consultant.
Schema: {
  recommendations: [{
    item: string,
    signal: string,
    action: "cut"|"run_as_special"|"replace"|"monitor",
    reason: string,
    suggested_replacement: string | null,
    monthly_savings: number
  }],
  summary: string,
  total_monthly_savings: number
}
Return ONLY valid JSON.`,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["dead_sku", scope.tenantId, locationId, since30],
    cacheTtlMs: 24 * 60 * 60_000,
    inputHash: hashInput({ problematic_count: problematic.length, season: currentSeason }),
    tenantId: scope.tenantId,
    locationId,
    userId: scope.userId,
    validate: (v: unknown) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      if (!Array.isArray(o.recommendations)) return null;
      return o as { recommendations: unknown[]; summary: string; total_monthly_savings: number };
    },
    fallback: () => ({ recommendations: [], summary: "Menu audit unavailable right now.", total_monthly_savings: 0 }),
  });

  return Response.json({ ...response, dead_skus: problematic.slice(0, 20), total_carrying_cost_usd: totalCarryingCost });
}
