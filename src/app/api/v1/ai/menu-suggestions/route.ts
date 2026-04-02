import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackMenuSuggestions } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateMenuSuggestions } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiMenuSuggestions } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

const daysAgo = (count: number) => {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return d.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiMenuSuggestions);
  if (!aiFeatureFlags.menuSuggestions()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackMenuSuggestions("No locations available for menu suggestions."));
  }

  const menuItems = await supabaseAdmin
    .from("menu_items")
    .select("id,name,base_price,category,location_id")
    .in("location_id", scope.scopedLocationIds);

  const specs = await supabaseAdmin
    .from("drink_specs")
    .select("id,menu_item_id,location_id,active")
    .eq("active", 1)
    .in("location_id", scope.scopedLocationIds);

  const specIds = (specs.data ?? []).map((s) => s.id);
  const specLines = specIds.length
    ? await supabaseAdmin.from("drink_spec_lines").select("drink_spec_id,ingredient_id,ounces").in("drink_spec_id", specIds)
    : { data: [] };

  const ingredientIds = Array.from(new Set((specLines.data ?? []).map((l) => l.ingredient_id)));
  const costs = ingredientIds.length
    ? await supabaseAdmin.from("ingredient_costs").select("ingredient_id,cost_per_oz,effective_to").is("effective_to", null).in("ingredient_id", ingredientIds)
    : { data: [] };

  const costMap = new Map((costs.data ?? []).map((r) => [r.ingredient_id, Number(r.cost_per_oz)]));
  const specCostMap = new Map<string, number>();
  for (const line of specLines.data ?? []) {
    specCostMap.set(line.drink_spec_id, (specCostMap.get(line.drink_spec_id) ?? 0) + Number(line.ounces ?? 0) * (costMap.get(line.ingredient_id) ?? 0));
  }

  const menuCostMap = new Map<string, number>();
  for (const spec of specs.data ?? []) {
    if (!menuCostMap.has(spec.menu_item_id)) menuCostMap.set(spec.menu_item_id, specCostMap.get(spec.id) ?? 0);
  }

  const since = daysAgo(30);
  const [orderItems, ctx] = await Promise.all([
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity,gross,created_at")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since),
    buildInsightContext({
      tenantId: scope.tenantId,
      locationId: scope.locationId ?? scope.scopedLocationIds[0],
      locationIds: scope.scopedLocationIds,
    }),
  ]);

  const salesMap = new Map<string, { qty: number; revenue: number }>();
  for (const row of orderItems.data ?? []) {
    const e = salesMap.get(row.menu_item_id) ?? { qty: 0, revenue: 0 };
    e.qty += Number(row.quantity ?? 0);
    e.revenue += Number(row.gross ?? 0);
    salesMap.set(row.menu_item_id, e);
  }

  const items = (menuItems.data ?? [])
    .map((item) => {
      const sales = salesMap.get(item.id);
      const qty = sales?.qty ?? 0;
      const revenue = sales?.revenue ?? 0;
      const price = qty > 0 ? revenue / qty : Number(item.base_price ?? 0);
      const cost = menuCostMap.get(item.id) ?? 0;
      const margin = price > 0 ? (price - cost) / price : 0;
      return { name: item.name, category: item.category, current_price: Number(price.toFixed(2)), cost_per_serv: Number(cost.toFixed(2)), margin_pct: Number((margin * 100).toFixed(1)), qty_sold: qty };
    })
    .filter((item) => item.qty_sold > 0)
    .slice(0, 20);

  if (items.length === 0) {
    return Response.json(fallbackMenuSuggestions("No recent sales data available to generate suggestions."));
  }

  const userPrompt = `
Provide menu pricing and spec optimization recommendations for ${ctx.location_name} based on the last 30 days.

MENU ITEMS (margin analysis):
${JSON.stringify(items, null, 2)}

BUSINESS CONTEXT:
- Revenue last 7 days: $${ctx.revenue_last_7d?.toFixed(2) ?? "N/A"} (${ctx.revenue_delta_pct !== null ? `${ctx.revenue_delta_pct > 0 ? "+" : ""}${ctx.revenue_delta_pct}% vs prior week` : "no trend data"})
- Category variance summary: ${JSON.stringify(ctx.category_summary)}

INGREDIENT COST CONTEXT (items with high shrinkage may have inflated costs):
${JSON.stringify(
  ctx.item_trends.filter((t) => (t.estimated_weekly_shrinkage_usd ?? 0) > 10).slice(0, 5).map((t) => ({
    ingredient_type: t.ingredient_type,
    weekly_shrinkage_usd: t.estimated_weekly_shrinkage_usd,
    cost_per_oz: t.cost_per_oz,
  })),
  null, 2
)}

Focus on items under 65% margin or with recently increased ingredient costs. Suggest modest, reversible changes.
  `.trim();

  const input = { items_count: items.length, since, location: ctx.location_name };

  const response = await runAiFeature({
    feature: "menu_suggestions",
    system: systemPrompts.menuSuggestions,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["menu", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(","), since],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateMenuSuggestions,
    fallback: () => fallbackMenuSuggestions("Menu suggestions are unavailable right now. Please try again later."),
  });

  return Response.json(response);
}
