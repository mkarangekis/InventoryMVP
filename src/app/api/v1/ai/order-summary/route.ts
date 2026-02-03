import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackOrderingSummary } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateOrderingSummary } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!aiFeatureFlags.orderingCopilot()) {
    return new Response("Not found", { status: 404 });
  }

  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackOrderingSummary("No locations available for ordering summary."),
    );
  }

  const pos = await supabaseAdmin
    .from("purchase_orders")
    .select("id,vendor_id,location_id,status,created_at")
    .eq("status", "draft")
    .in("location_id", scope.scopedLocationIds);

  if (pos.error) {
    return Response.json(
      fallbackOrderingSummary("Unable to load draft purchase orders."),
    );
  }

  const poIds = (pos.data ?? []).map((row) => row.id);
  const lines = poIds.length
    ? await supabaseAdmin
        .from("purchase_order_lines")
        .select("purchase_order_id,inventory_item_id,qty_units,unit_price,line_total")
        .in("purchase_order_id", poIds)
    : { data: [] };

  const items = lines.data ?? [];
  const totalLines = items.reduce((sum, line) => sum + (line.qty_units ?? 0), 0);
  const totalCost = items.reduce((sum, line) => sum + (line.line_total ?? 0), 0);

  if (!poIds.length || !items.length) {
    return Response.json(
      fallbackOrderingSummary("No draft purchase orders yet."),
    );
  }

  const input = {
    total_pos: poIds.length,
    total_lines: totalLines,
    total_cost: Number(totalCost.toFixed(2)),
    top_lines: items
      .slice(0, 10)
      .map((line) => ({
        inventory_item_id: line.inventory_item_id,
        qty_units: line.qty_units,
        unit_price: line.unit_price,
        line_total: line.line_total,
      })),
  };

  const summary = await runAiFeature({
    feature: "ordering_copilot",
    system: systemPrompts.orderingSummary,
    user: `Summarize draft purchase orders for a bar manager. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "ordering",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
    ],
    cacheTtlMs: 15 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateOrderingSummary,
    fallback: () =>
      fallbackOrderingSummary(
        "Draft orders are ready, but AI summary is unavailable.",
      ),
  });

  return Response.json(summary);
}
