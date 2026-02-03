import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackMenuSuggestions } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateMenuSuggestions } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiMenuSuggestions } from "@/lib/demo";

const daysAgo = (count: number) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) {
    return Response.json(demoAiMenuSuggestions);
  }

  if (!aiFeatureFlags.menuSuggestions()) {
    return new Response("Not found", { status: 404 });
  }

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackMenuSuggestions("No locations available for menu suggestions."),
    );
  }

  const menuItems = await supabaseAdmin
    .from("menu_items")
    .select("id,name,base_price,location_id")
    .in("location_id", scope.scopedLocationIds);

  const specs = await supabaseAdmin
    .from("drink_specs")
    .select("id,menu_item_id,location_id,active")
    .eq("active", 1)
    .in("location_id", scope.scopedLocationIds);

  const specIds = (specs.data ?? []).map((spec) => spec.id);
  const specLines = specIds.length
    ? await supabaseAdmin
        .from("drink_spec_lines")
        .select("drink_spec_id,ingredient_id,ounces")
        .in("drink_spec_id", specIds)
    : { data: [] };

  const ingredientIds = Array.from(
    new Set((specLines.data ?? []).map((line) => line.ingredient_id)),
  );

  const costs = ingredientIds.length
    ? await supabaseAdmin
        .from("ingredient_costs")
        .select("ingredient_id,cost_per_oz,effective_to")
        .is("effective_to", null)
        .in("ingredient_id", ingredientIds)
    : { data: [] };

  const costMap = new Map(
    (costs.data ?? []).map((row) => [row.ingredient_id, Number(row.cost_per_oz)]),
  );

  const specCostMap = new Map<string, number>();
  for (const line of specLines.data ?? []) {
    const prev = specCostMap.get(line.drink_spec_id) ?? 0;
    const costPerOz = costMap.get(line.ingredient_id) ?? 0;
    specCostMap.set(
      line.drink_spec_id,
      prev + Number(line.ounces ?? 0) * costPerOz,
    );
  }

  const menuCostMap = new Map<string, number>();
  for (const spec of specs.data ?? []) {
    const cost = specCostMap.get(spec.id) ?? 0;
    if (!menuCostMap.has(spec.menu_item_id)) {
      menuCostMap.set(spec.menu_item_id, cost);
    }
  }

  const since = daysAgo(30);
  const orderItems = await supabaseAdmin
    .from("pos_order_items")
    .select("menu_item_id,quantity,gross,created_at")
    .in("location_id", scope.scopedLocationIds)
    .gte("created_at", since);

  const salesMap = new Map<
    string,
    { qty: number; revenue: number }
  >();
  for (const row of orderItems.data ?? []) {
    const entry = salesMap.get(row.menu_item_id) ?? { qty: 0, revenue: 0 };
    entry.qty += Number(row.quantity ?? 0);
    entry.revenue += Number(row.gross ?? 0);
    salesMap.set(row.menu_item_id, entry);
  }

  const items = (menuItems.data ?? [])
    .map((item) => {
      const sales = salesMap.get(item.id);
      const qty = sales?.qty ?? 0;
      const revenue = sales?.revenue ?? 0;
      const priceEach =
        qty > 0 ? revenue / qty : Number(item.base_price ?? 0);
      const costPerServ = menuCostMap.get(item.id) ?? 0;
      const marginPct = priceEach > 0 ? (priceEach - costPerServ) / priceEach : 0;
      return {
        name: item.name,
        current_price: Number(priceEach.toFixed(2)),
        cost_per_serv: Number(costPerServ.toFixed(2)),
        margin_pct: Number((marginPct * 100).toFixed(1)),
        qty_sold: qty,
      };
    })
    .filter((item) => item.qty_sold > 0)
    .slice(0, 20);

  if (items.length === 0) {
    return Response.json(
      fallbackMenuSuggestions(
        "No recent sales data available to generate suggestions.",
      ),
    );
  }

  const input = {
    items,
    note:
      "Suggest low-risk price or spec tweaks. Keep changes modest and reversible.",
  };

  const response = await runAiFeature({
    feature: "menu_suggestions",
    system: systemPrompts.menuSuggestions,
    user: `Provide menu profitability suggestions. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_REASONING ?? "gpt-4o-mini",
    cacheKeyParts: [
      "menu",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
      since,
    ],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateMenuSuggestions,
    fallback: () =>
      fallbackMenuSuggestions(
        "Menu suggestions are unavailable right now. Please try again later.",
      ),
  });

  return Response.json(response);
}
