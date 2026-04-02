import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackShiftPush } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateShiftPush } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiShiftPush } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

const daysAgo = (count: number) => {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return d.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiShiftPush);
  if (!aiFeatureFlags.shiftPush()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackShiftPush("No locations available for shift push."));
  }

  const since = daysAgo(7);

  const [menuItems, orderItems, ctx] = await Promise.all([
    supabaseAdmin.from("menu_items").select("id,name,base_price,category,location_id").in("location_id", scope.scopedLocationIds),
    supabaseAdmin
      .from("pos_order_items")
      .select("menu_item_id,quantity,gross,created_at")
      .in("location_id", scope.scopedLocationIds)
      .gte("created_at", since),
    buildInsightContext({
      tenantId: scope.tenantId,
      locationId: scope.locationId ?? scope.scopedLocationIds[0] ?? "",
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
      return { name: item.name, recent_qty: qty, price_each: Number(price.toFixed(2)), category: item.category };
    })
    .slice(0, 30);

  if (items.length === 0) {
    return Response.json(fallbackShiftPush("No recent sales data available for shift push."));
  }

  const userPrompt = `
Generate tonight's shift push recommendations for ${ctx.location_name}.

MENU ITEMS (last 7 days velocity):
${JSON.stringify(items, null, 2)}

TONIGHT'S CONTEXT:
- Revenue trend: ${ctx.revenue_delta_pct !== null ? `${ctx.revenue_delta_pct > 0 ? "+" : ""}${ctx.revenue_delta_pct}% vs prior week` : "no prior data"}
${ctx.upcoming_events.length ? `- Upcoming events: ${ctx.upcoming_events.map((e) => `${e.event_name} on ${e.event_date}`).join(", ")}` : ""}

OVERSTOCKED / HIGH-VARIANCE ITEMS (may need to move inventory):
${JSON.stringify(
  ctx.item_trends
    .filter((t) => t.variance_8w[0]?.variance_pct > 0.1)
    .slice(0, 5)
    .map((t) => ({ item: t.item, variance_pct: t.variance_8w[0]?.variance_pct })),
  null, 2
)}

Recommend 3-5 items with natural, specific guest-facing upsell scripts. Prioritize items with high margin and current overstock.
  `.trim();

  const input = { items_count: items.length, since, location: ctx.location_name };

  const response = await runAiFeature({
    feature: "shift_push",
    system: systemPrompts.shiftPush,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["shift", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(","), since],
    cacheTtlMs: 6 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateShiftPush,
    fallback: () => fallbackShiftPush("Shift push suggestions are unavailable right now."),
  });

  return Response.json(response);
}
