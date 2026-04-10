import { getUserScope } from "@/ai/context";
import { runAiFeature, hashInput } from "@/ai/run";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { detectMarketTier, getBenchmarksForTier, scoreItemPricing } from "@/lib/ai/competitive-pricing";
import { demoAiCompetitivePricing } from "@/lib/demo";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiCompetitivePricing);

  if (scope.scopedLocationIds.length === 0) {
    return Response.json({ suggestions: [], market_tier: "value", city: "Unknown", error: "No locations available." });
  }

  const locationId = scope.locationId ?? scope.scopedLocationIds[0] ?? "";
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [menuItems, orderItems, ctx] = await Promise.all([
    supabaseAdmin
      .from("menu_items")
      .select("id,name,base_price,category,location_id")
      .in("location_id", scope.scopedLocationIds),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity,gross")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since),
    buildInsightContext({ tenantId: scope.tenantId, locationId, locationIds: scope.scopedLocationIds }),
  ]);

  // Detect city from location address
  const locationResult = await supabaseAdmin
    .from("locations")
    .select("address, name")
    .eq("id", locationId)
    .single();

  const address = (locationResult.data?.address ?? ctx.location_name) as string;
  const city = address.split(",")[1]?.trim() ?? address.split(",")[0]?.trim() ?? "Unknown";
  const tier = detectMarketTier(city);
  const benchmarks = getBenchmarksForTier(tier);

  // Build sales map
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
      return { id: item.id, name: item.name, category: item.category, price, qty };
    })
    .filter((i) => i.qty > 0 && i.price > 0);

  const itemSignals = items.map((i) =>
    scoreItemPricing(i.name, i.category, i.price, i.qty, tier)
  );

  const underpriced = itemSignals.filter((s) => s.signal === "underpriced" || s.signal === "room_to_increase");
  const totalMonthlyOpportunity = underpriced.reduce((s, i) => s + i.monthly_opportunity_usd, 0);

  if (items.length === 0) {
    return Response.json({ suggestions: [], market_tier: tier, city, benchmarks, error: "No sales data available." });
  }

  const userPrompt = `
You are analyzing drink pricing for ${ctx.location_name}, located in ${city} (${tier} market tier).

MARKET BENCHMARKS for ${tier.toUpperCase()} tier:
${JSON.stringify(benchmarks, null, 2)}

ITEM PRICING SIGNALS (items where we may be leaving money on the table):
${JSON.stringify(underpriced.slice(0, 15), null, 2)}

TOTAL MONTHLY REVENUE OPPORTUNITY: $${totalMonthlyOpportunity.toFixed(2)}

For each underpriced item, provide:
1. A specific, confident price increase recommendation (never more than 15% at once)
2. The business rationale referencing the ${city} market
3. The monthly revenue impact
4. Any risk (guest pushback, competitive sensitivity)

Be direct and owner-friendly. Use dollar amounts, not jargon.
`.trim();

  const response = await runAiFeature({
    feature: "competitive_pricing",
    system: `You are Pourdex AI, an expert bar pricing analyst. You know the ${city} market well.
Schema: {
  suggestions: [{
    drink: string,
    current_price: number,
    suggested_price: number,
    market_benchmark: number,
    monthly_revenue_gain: number,
    rationale: string,
    risk: string
  }],
  summary: string,
  total_monthly_opportunity: number
}
Return ONLY valid JSON.`,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["competitive_pricing", scope.tenantId, locationId, since],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput({ items_count: items.length, city, tier, since }),
    tenantId: scope.tenantId,
    locationId,
    userId: scope.userId,
    validate: (v: unknown) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      if (!Array.isArray(o.suggestions)) return null;
      return o as { suggestions: unknown[]; summary: string; total_monthly_opportunity: number };
    },
    fallback: () => ({ suggestions: [], summary: "Pricing analysis unavailable right now.", total_monthly_opportunity: 0 }),
  });

  return Response.json({ ...response, market_tier: tier, city, benchmarks, item_signals: itemSignals });
}
