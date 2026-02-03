import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackCountSchedule } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateCountSchedule } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiCountSchedule } from "@/lib/demo";

const daysAgo = (count: number) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) {
    return Response.json(demoAiCountSchedule);
  }

  if (!aiFeatureFlags.countScheduler()) {
    return new Response("Not found", { status: 404 });
  }

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackCountSchedule("No locations available for count scheduling."),
    );
  }

  const since = daysAgo(30);
  const flags = await supabaseAdmin
    .from("variance_flags")
    .select("inventory_item_id,severity,week_start_date")
    .in("location_id", scope.scopedLocationIds)
    .gte("week_start_date", since);

  const itemIds = Array.from(
    new Set((flags.data ?? []).map((row) => row.inventory_item_id)),
  );

  const items = itemIds.length
    ? await supabaseAdmin
        .from("inventory_items")
        .select("id,name_override,ingredient_id")
        .in("id", itemIds)
    : { data: [] };

  const ingredientIds = Array.from(
    new Set((items.data ?? []).map((row) => row.ingredient_id)),
  );

  const ingredients = ingredientIds.length
    ? await supabaseAdmin
        .from("ingredients")
        .select("id,name")
        .in("id", ingredientIds)
    : { data: [] };

  const ingredientMap = new Map(
    (ingredients.data ?? []).map((row) => [row.id, row.name]),
  );

  const itemMap = new Map(
    (items.data ?? []).map((row) => [
      row.id,
      row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
    ]),
  );

  const counts = new Map<string, { total: number; high: number }>();
  for (const flag of flags.data ?? []) {
    const entry = counts.get(flag.inventory_item_id) ?? { total: 0, high: 0 };
    entry.total += 1;
    if (flag.severity === "high") entry.high += 1;
    counts.set(flag.inventory_item_id, entry);
  }

  const input = Array.from(counts.entries()).map(([itemId, entry]) => ({
    item: itemMap.get(itemId) ?? "Unknown",
    variance_score: entry.total + entry.high * 2,
    high_flags: entry.high,
  }));

  if (input.length === 0) {
    return Response.json(
      fallbackCountSchedule(
        "No variance history yet. Start tracking inventory to build a count plan.",
      ),
    );
  }

  const response = await runAiFeature({
    feature: "count_schedule",
    system: systemPrompts.countSchedule,
    user: `Recommend count frequency based on variance scores. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "count",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
      since,
    ],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateCountSchedule,
    fallback: () =>
      fallbackCountSchedule(
        "Count schedule is unavailable right now. Please try again later.",
      ),
  });

  return Response.json(response);
}
