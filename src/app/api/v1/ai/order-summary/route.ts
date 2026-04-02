import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackOrderingSummary } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateOrderingSummary } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiOrderingSummary } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiOrderingSummary);
  if (!aiFeatureFlags.orderingCopilot()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackOrderingSummary("No locations available for ordering summary."));
  }

  const pos = await supabaseAdmin
    .from("purchase_orders")
    .select("id,vendor_id,location_id,status,created_at")
    .eq("status", "draft")
    .in("location_id", scope.scopedLocationIds);

  if (pos.error) return Response.json(fallbackOrderingSummary("Unable to load draft purchase orders."));

  const poIds = (pos.data ?? []).map((r) => r.id);
  const lines = poIds.length
    ? await supabaseAdmin
        .from("purchase_order_lines")
        .select("purchase_order_id,inventory_item_id,qty_units,unit_price,line_total")
        .in("purchase_order_id", poIds)
    : { data: [] };

  if (!poIds.length || !(lines.data ?? []).length) {
    return Response.json(fallbackOrderingSummary("No draft purchase orders yet."));
  }

  const items = lines.data ?? [];
  const totalCost = items.reduce((s, l) => s + Number(l.line_total ?? 0), 0);

  // Resolve item names
  const itemIds = Array.from(new Set(items.map((l) => l.inventory_item_id)));
  const invItems = itemIds.length
    ? await supabaseAdmin.from("inventory_items").select("id,name_override,ingredient_id").in("id", itemIds)
    : { data: [] };
  const ingIds = Array.from(new Set((invItems.data ?? []).map((i) => i.ingredient_id)));
  const ings = ingIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name").in("id", ingIds)
    : { data: [] };
  const ingMap = new Map((ings.data ?? []).map((g) => [g.id, g.name]));
  const nameMap = new Map((invItems.data ?? []).map((i) => [i.id, i.name_override || ingMap.get(i.ingredient_id) || i.id]));

  // Build insight context for reorder context
  const ctx = await buildInsightContext({
    tenantId: scope.tenantId,
    locationId: scope.locationId ?? scope.scopedLocationIds[0] ?? "",
    locationIds: scope.scopedLocationIds,
  });

  const topLines = items.slice(0, 15).map((l) => ({
    item: nameMap.get(l.inventory_item_id) ?? l.inventory_item_id,
    qty_units: l.qty_units,
    unit_price: Number(l.unit_price),
    line_total: Number(l.line_total),
  }));

  const userPrompt = `
Review these draft purchase orders for ${ctx.location_name} and provide an ordering strategy brief.

DRAFT PURCHASE ORDERS:
- Total POs: ${poIds.length}
- Total line items: ${items.length}
- Total order value: $${totalCost.toFixed(2)}

ORDER LINES (top 15):
${JSON.stringify(topLines, null, 2)}

CURRENT VARIANCE CONTEXT (items with active issues):
${JSON.stringify(ctx.item_trends.filter((t) => t.variance_8w[0]?.variance_pct > 0.05).slice(0, 8).map((t) => ({
  item: t.item,
  trend: t.trend_direction,
  weekly_shrinkage_usd: t.estimated_weekly_shrinkage_usd,
})), null, 2)}

UPCOMING EVENTS that may affect consumption:
${ctx.upcoming_events.length ? JSON.stringify(ctx.upcoming_events) : "None scheduled"}

REVENUE TREND:
- Last 7 days: $${ctx.revenue_last_7d?.toFixed(2) ?? "N/A"} (${ctx.revenue_delta_pct !== null ? `${ctx.revenue_delta_pct}% vs prior week` : "no prior data"})

Provide specific ordering recommendations, flag any items with worsening variance that should be ordered conservatively, and identify any risks.
  `.trim();

  const input = { total_pos: poIds.length, total_cost: Number(totalCost.toFixed(2)), date: ctx.as_of_date };

  const summary = await runAiFeature({
    feature: "ordering_copilot",
    system: systemPrompts.orderingSummary,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["ordering", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(",")],
    cacheTtlMs: 15 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateOrderingSummary,
    fallback: () => fallbackOrderingSummary("Draft orders are ready, but AI summary is unavailable."),
  });

  return Response.json(summary);
}
