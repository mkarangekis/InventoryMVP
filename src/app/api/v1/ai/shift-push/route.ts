import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackShiftPush } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateShiftPush } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";

const daysAgo = (count: number) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
};

export async function GET(request: Request) {
  if (!aiFeatureFlags.shiftPush()) {
    return new Response("Not found", { status: 404 });
  }

  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackShiftPush("No locations available for shift push."),
    );
  }

  const since = daysAgo(7);
  const menuItems = await supabaseAdmin
    .from("menu_items")
    .select("id,name,base_price,location_id")
    .in("location_id", scope.scopedLocationIds);

  const orderItems = await supabaseAdmin
    .from("pos_order_items")
    .select("menu_item_id,quantity,gross,created_at")
    .in("location_id", scope.scopedLocationIds)
    .gte("created_at", since);

  const salesMap = new Map<string, { qty: number; revenue: number }>();
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
      return {
        name: item.name,
        recent_qty: qty,
        price_each: Number(priceEach.toFixed(2)),
      };
    })
    .slice(0, 30);

  if (items.length === 0) {
    return Response.json(
      fallbackShiftPush("No recent sales data available for shift push."),
    );
  }

  const input = {
    items,
    note:
      "Suggest 3-5 items to push tonight based on margin-friendly pricing and recent velocity. Avoid blaming staff.",
  };

  const response = await runAiFeature({
    feature: "shift_push",
    system: systemPrompts.shiftPush,
    user: `Generate shift push suggestions with short scripts. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "shift",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
      since,
    ],
    cacheTtlMs: 6 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateShiftPush,
    fallback: () =>
      fallbackShiftPush(
        "Shift push suggestions are unavailable right now.",
      ),
  });

  return Response.json(response);
}
