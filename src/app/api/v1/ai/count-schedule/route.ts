import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackCountSchedule } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateCountSchedule } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiCountSchedule } from "@/lib/demo";
import { buildInsightContext } from "@/ai/context-builder";

const daysAgo = (count: number) => {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return d.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) return Response.json(demoAiCountSchedule);
  if (!aiFeatureFlags.countScheduler()) return new Response("Not found", { status: 404 });

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(fallbackCountSchedule("No locations available for count scheduling."));
  }

  const since = daysAgo(56); // 8 weeks for baseline
  const [flagsRes, ctx] = await Promise.all([
    supabaseAdmin
      .from("variance_flags")
      .select("inventory_item_id,severity,week_start_date,z_score")
      .in("location_id", scope.scopedLocationIds)
      .gte("week_start_date", since),
    buildInsightContext({
      tenantId: scope.tenantId,
      locationId: scope.locationId ?? scope.scopedLocationIds[0],
      locationIds: scope.scopedLocationIds,
    }),
  ]);

  const itemIds = Array.from(new Set((flagsRes.data ?? []).map((r) => r.inventory_item_id)));

  if (itemIds.length === 0) {
    return Response.json(
      fallbackCountSchedule("No variance history yet. Start tracking inventory to build a count plan."),
    );
  }

  const items = await supabaseAdmin
    .from("inventory_items")
    .select("id,name_override,ingredient_id")
    .in("id", itemIds);

  const ingIds = Array.from(new Set((items.data ?? []).map((r) => r.ingredient_id)));
  const ings = ingIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name").in("id", ingIds)
    : { data: [] };
  const ingMap = new Map((ings.data ?? []).map((r) => [r.id, r.name]));
  const itemMap = new Map((items.data ?? []).map((r) => [r.id, r.name_override || ingMap.get(r.ingredient_id) || "Unknown"]));

  const counts = new Map<string, { total: number; high: number; maxZ: number }>();
  for (const flag of flagsRes.data ?? []) {
    const e = counts.get(flag.inventory_item_id) ?? { total: 0, high: 0, maxZ: 0 };
    e.total += 1;
    if (flag.severity === "high") e.high += 1;
    if (flag.z_score !== null && Number(flag.z_score) > e.maxZ) e.maxZ = Number(flag.z_score);
    counts.set(flag.inventory_item_id, e);
  }

  const input = Array.from(counts.entries()).map(([itemId, entry]) => {
    const trend = ctx.item_trends.find((t) => t.inventory_item_id === itemId);
    return {
      item: itemMap.get(itemId) ?? "Unknown",
      variance_score: entry.total + entry.high * 2,
      high_flags: entry.high,
      max_z_score: Number(entry.maxZ.toFixed(2)),
      trend_direction: trend?.trend_direction ?? "unknown",
      weekly_shrinkage_usd: trend?.estimated_weekly_shrinkage_usd ?? null,
    };
  });

  const userPrompt = `
Recommend inventory count schedule for ${ctx.location_name} based on 8-week variance history.

ITEM VARIANCE SCORES:
${JSON.stringify(input, null, 2)}

GUIDELINES:
- Z-score > 2 OR worsening trend = weekly count
- Z-score 1-2 OR stable with history = biweekly
- Z-score < 1 AND improving = monthly
- Include estimated annual savings from catching variance earlier

Prioritize the top 5-8 most important items to count regularly.
  `.trim();

  const response = await runAiFeature({
    feature: "count_schedule",
    system: systemPrompts.countSchedule,
    user: userPrompt,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    cacheKeyParts: ["count", scope.tenantId, scope.locationId ?? scope.scopedLocationIds.join(","), since],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput({ input_count: input.length, since }),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateCountSchedule,
    fallback: () => fallbackCountSchedule("Count schedule is unavailable right now. Please try again later."),
  });

  return Response.json(response);
}
