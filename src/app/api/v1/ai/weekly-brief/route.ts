import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackWeeklyBrief } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateWeeklyBrief } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiWeeklyBrief } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

const daysAgo = (count: number) => {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return d.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiWeeklyBrief);
  if (!aiFeatureFlags.weeklyBrief()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackWeeklyBrief("No locations available for weekly brief."));
  }

  const weekStart  = daysAgo(7);
  const prevStart  = daysAgo(14);

  const [orders, prevOrders, varianceRes, snapshots, ctx] = await Promise.all([
    supabaseAdmin
      .from("pos_orders")
      .select("total,closed_at")
      .in("location_id", scope.scopedLocationIds)
      .gte("closed_at", weekStart),
    supabaseAdmin
      .from("pos_orders")
      .select("total,closed_at")
      .in("location_id", scope.scopedLocationIds)
      .gte("closed_at", prevStart)
      .lt("closed_at", weekStart),
    supabaseAdmin
      .from("variance_flags")
      .select("severity,z_score,inventory_item_id")
      .in("location_id", scope.scopedLocationIds)
      .gte("week_start_date", weekStart),
    supabaseAdmin
      .from("inventory_snapshots")
      .select("id")
      .in("location_id", scope.scopedLocationIds)
      .gte("snapshot_date", weekStart),
    buildInsightContext({
      tenantId: scope.tenantId,
      locationId: scope.locationId ?? scope.scopedLocationIds[0] ?? "",
      locationIds: scope.scopedLocationIds,
    }),
  ]);

  const revenue     = (orders.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
  const prevRevenue = (prevOrders.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
  const varFlags    = varianceRes.data ?? [];
  const highFlags   = varFlags.filter((f) => f.severity === "high").length;

  if (revenue === 0 && varFlags.length === 0 && (snapshots.data ?? []).length === 0) {
    return Response.json(
      fallbackWeeklyBrief("Not enough data this week yet. Connect POS and run inventory counts to unlock insights."),
    );
  }

  const userPrompt = `
Write a weekly bar operations brief for ${ctx.location_name} (${weekStart.slice(0, 10)} to ${ctx.as_of_date}).

REVENUE:
- This week: $${revenue.toFixed(2)}
- Last week: $${prevRevenue.toFixed(2)}
- Change: ${prevRevenue > 0 ? `${(((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)}%` : "N/A"}

VARIANCE SUMMARY:
- Total flags this week: ${varFlags.length} (${highFlags} high-severity)
- Estimated total shrinkage cost: $${ctx.total_shrinkage_usd?.toFixed(2) ?? "unknown"}
- Items worsening over 8 weeks: ${ctx.item_trends.filter((t) => t.trend_direction === "worsening").length}
- Top worsening items: ${ctx.item_trends.filter((t) => t.trend_direction === "worsening").slice(0, 3).map((t) => t.item).join(", ") || "none"}

INVENTORY COUNTS THIS WEEK: ${(snapshots.data ?? []).length}

TOP SELLING ITEMS (7-day):
${JSON.stringify(ctx.top_selling_items.slice(0, 10), null, 2)}

CATEGORY VARIANCE SUMMARY:
${JSON.stringify(ctx.category_summary, null, 2)}

UPCOMING EVENTS:
${ctx.upcoming_events.length ? JSON.stringify(ctx.upcoming_events) : "None scheduled"}

Generate a practical brief with specific wins (anchored to dollar amounts), watchouts (with cost impact), and actionable next steps.
  `.trim();

  const input = { revenue, prevRevenue, varCount: varFlags.length, highFlags, date: ctx.as_of_date };

  const response = await runAiFeature({
    feature: "weekly_brief",
    system: systemPrompts.weeklyBrief,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["weekly", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(","), weekStart],
    cacheTtlMs: 6 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateWeeklyBrief,
    fallback: () => fallbackWeeklyBrief("Weekly brief is unavailable right now. Please try again later."),
  });

  return Response.json(response);
}
