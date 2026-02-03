import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackWeeklyBrief } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateWeeklyBrief } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiWeeklyBrief } from "@/lib/demo";

const daysAgo = (count: number) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) {
    return Response.json(demoAiWeeklyBrief);
  }

  if (!aiFeatureFlags.weeklyBrief()) {
    return new Response("Not found", { status: 404 });
  }

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackWeeklyBrief("No locations available for weekly brief."),
    );
  }

  const weekStart = daysAgo(7);
  const prevWeekStart = daysAgo(14);

  const orders = await supabaseAdmin
    .from("pos_orders")
    .select("total,closed_at")
    .in("location_id", scope.scopedLocationIds)
    .gte("closed_at", weekStart);

  const prevOrders = await supabaseAdmin
    .from("pos_orders")
    .select("total,closed_at")
    .in("location_id", scope.scopedLocationIds)
    .gte("closed_at", prevWeekStart)
    .lt("closed_at", weekStart);

  const variance = await supabaseAdmin
    .from("variance_flags")
    .select("id,severity")
    .in("location_id", scope.scopedLocationIds)
    .gte("week_start_date", weekStart);

  const snapshots = await supabaseAdmin
    .from("inventory_snapshots")
    .select("id")
    .in("location_id", scope.scopedLocationIds)
    .gte("snapshot_date", weekStart);

  const revenue = (orders.data ?? []).reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  );
  const prevRevenue = (prevOrders.data ?? []).reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  );
  const varianceCount = (variance.data ?? []).length;
  const snapshotsCount = (snapshots.data ?? []).length;

  const input = {
    week_range: weekStart,
    revenue,
    prev_revenue: prevRevenue,
    orders_count: (orders.data ?? []).length,
    variance_flags: varianceCount,
    inventory_counts: snapshotsCount,
  };

  if (revenue === 0 && varianceCount === 0 && snapshotsCount === 0) {
    return Response.json(
      fallbackWeeklyBrief(
        "Not enough data this week yet. Connect POS and run inventory counts to unlock insights.",
      ),
    );
  }

  const response = await runAiFeature({
    feature: "weekly_brief",
    system: systemPrompts.weeklyBrief,
    user: `Write a weekly owner brief with wins, watchouts, and next actions. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "weekly",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
      weekStart,
    ],
    cacheTtlMs: 6 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateWeeklyBrief,
    fallback: () =>
      fallbackWeeklyBrief(
        "Weekly brief is unavailable right now. Please try again later.",
      ),
  });

  return Response.json(response);
}
