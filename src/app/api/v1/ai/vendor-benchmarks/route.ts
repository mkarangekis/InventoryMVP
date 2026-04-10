import { getUserScope } from "@/ai/context";
import { runAiFeature, hashInput } from "@/ai/run";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { detectMarketTier, normalizeCategory } from "@/lib/ai/competitive-pricing";
import { scoreVendorPrice } from "@/lib/ai/vendor-benchmarks";
import { demoAiVendorBenchmarks } from "@/lib/demo";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiVendorBenchmarks);

  if (scope.scopedLocationIds.length === 0) {
    return Response.json({ vendor_signals: [], savings_potential: 0, error: "No locations available." });
  }

  const locationId = scope.locationId ?? scope.scopedLocationIds[0] ?? "";
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();

  const [purchaseLines, ctx, locationResult] = await Promise.all([
    supabaseAdmin
      .from("purchase_order_lines")
      .select(`
        inventory_item_id, qty_units, unit_price, line_total,
        purchase_order:purchase_orders(vendor_id, created_at, location_id)
      `)
      .in("purchase_order.location_id" as string, scope.scopedLocationIds)
      .gte("purchase_order.created_at" as string, since)
      .limit(500),
    buildInsightContext({ tenantId: scope.tenantId, locationId, locationIds: scope.scopedLocationIds }),
    supabaseAdmin.from("locations").select("address").eq("id", locationId).single(),
  ]);

  const address = (locationResult.data?.address ?? ctx.location_name) as string;
  const city = address.split(",")[1]?.trim() ?? address.split(",")[0]?.trim() ?? "Unknown";
  const tier = detectMarketTier(city);

  // Aggregate unit prices per item (use average over 90 days)
  const itemPriceMap = new Map<string, { totalCost: number; totalUnits: number; orderCount: number }>();
  for (const line of purchaseLines.data ?? []) {
    const existing = itemPriceMap.get(line.inventory_item_id) ?? { totalCost: 0, totalUnits: 0, orderCount: 0 };
    existing.totalCost += Number(line.unit_price ?? 0) * Number(line.qty_units ?? 0);
    existing.totalUnits += Number(line.qty_units ?? 0);
    existing.orderCount += 1;
    itemPriceMap.set(line.inventory_item_id, existing);
  }

  // Resolve item names and ingredient types
  const itemIds = Array.from(itemPriceMap.keys());
  if (itemIds.length === 0) {
    return Response.json({ vendor_signals: [], savings_potential: 0, city, market_tier: tier, error: "No purchase order data found." });
  }

  const invItems = await supabaseAdmin
    .from("inventory_items")
    .select("id,name_override,ingredient_id")
    .in("id", itemIds);

  const ingIds = Array.from(new Set((invItems.data ?? []).map((i) => i.ingredient_id)));
  const ings = ingIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name,type").in("id", ingIds)
    : { data: [] };

  const ingMap = new Map((ings.data ?? []).map((g) => [g.id, { name: g.name, type: g.type }]));
  const nameMap = new Map((invItems.data ?? []).map((i) => [
    i.id,
    { name: i.name_override || ingMap.get(i.ingredient_id)?.name || "Unknown", type: ingMap.get(i.ingredient_id)?.type ?? null }
  ]));

  // Score each item
  const vendorSignals = [];
  for (const [itemId, stats] of itemPriceMap) {
    if (stats.totalUnits === 0) continue;
    const avgUnitPrice = stats.totalCost / stats.totalUnits;
    const meta = nameMap.get(itemId);
    const monthlyUnits = stats.totalUnits / 3; // 90-day window → monthly avg

    const signal = scoreVendorPrice(
      meta?.name ?? "Unknown",
      meta?.type ?? null,
      avgUnitPrice,
      monthlyUnits,
      tier,
    );
    vendorSignals.push(signal);
  }

  // Sort by biggest savings opportunity first
  vendorSignals.sort((a, b) => b.annual_savings_potential_usd - a.annual_savings_potential_usd);

  const overpaying = vendorSignals.filter((s) => s.signal === "overpaying" || s.signal === "slightly_high");
  const totalAnnualSavings = overpaying.reduce((s, i) => s + i.annual_savings_potential_usd, 0);

  if (overpaying.length === 0) {
    return Response.json({
      vendor_signals: vendorSignals.slice(0, 20),
      savings_potential: 0,
      city,
      market_tier: tier,
      summary: "Your vendor pricing looks competitive. No major savings opportunities identified.",
      recommendations: [],
    });
  }

  const userPrompt = `
Analyze vendor pricing for ${ctx.location_name} (${city}, ${tier} market).

ITEMS WHERE WE MAY BE OVERPAYING:
${JSON.stringify(overpaying.slice(0, 12), null, 2)}

TOTAL ANNUAL SAVINGS POTENTIAL: $${totalAnnualSavings.toFixed(0)}

For each item where we're overpaying:
1. Explain in plain language what's happening (e.g., "You're paying $34 for Tito's 1.75L — market rate is $28")
2. Give a specific action (call your rep, switch distributors, consolidate orders)
3. Estimate the savings
4. Flag any items worth negotiating volume discounts on

Write for a bar owner, not an accountant. Keep it practical.
`.trim();

  const response = await runAiFeature({
    feature: "vendor_benchmarks",
    system: `You are Pourdex AI, an expert bar cost consultant.
Schema: {
  recommendations: [{
    item: string,
    your_price: number,
    market_price: number,
    action: string,
    annual_savings: number,
    urgency: "low"|"med"|"high"
  }],
  summary: string,
  total_annual_savings: number
}
Return ONLY valid JSON.`,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["vendor_benchmarks", scope.tenantId, locationId, since],
    cacheTtlMs: 24 * 60 * 60_000,
    inputHash: hashInput({ item_count: overpaying.length, city, tier }),
    tenantId: scope.tenantId,
    locationId,
    userId: scope.userId,
    validate: (v: unknown) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      if (!Array.isArray(o.recommendations)) return null;
      return o as { recommendations: unknown[]; summary: string; total_annual_savings: number };
    },
    fallback: () => ({ recommendations: [], summary: "Vendor analysis unavailable right now.", total_annual_savings: 0 }),
  });

  return Response.json({ ...response, vendor_signals: vendorSignals.slice(0, 20), city, market_tier: tier });
}
