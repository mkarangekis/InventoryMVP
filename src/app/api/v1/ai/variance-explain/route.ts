import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackVarianceExplain } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateVarianceExplain } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!aiFeatureFlags.varianceExplain()) {
    return new Response("Not found", { status: 404 });
  }

  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackVarianceExplain("No locations available for variance analysis."),
    );
  }

  const flags = await supabaseAdmin
    .from("variance_flags")
    .select(
      "inventory_item_id,variance_pct,expected_remaining_oz,actual_remaining_oz,severity,week_start_date,location_id",
    )
    .in("location_id", scope.scopedLocationIds)
    .order("week_start_date", { ascending: false })
    .limit(25);

  if (flags.error) {
    return Response.json(
      fallbackVarianceExplain("Unable to load variance data."),
    );
  }

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

  const input = (flags.data ?? []).map((flag) => ({
    item: itemMap.get(flag.inventory_item_id) ?? "Unknown",
    variance_pct: Number(flag.variance_pct ?? 0),
    expected_remaining_oz: Number(flag.expected_remaining_oz ?? 0),
    actual_remaining_oz: Number(flag.actual_remaining_oz ?? 0),
    severity: flag.severity ?? "low",
  }));

  if (input.length === 0) {
    return Response.json(
      fallbackVarianceExplain(
        "No variance flags yet. Connect POS and complete inventory counts to see insights.",
      ),
    );
  }

  const response = await runAiFeature({
    feature: "variance_explain",
    system: systemPrompts.varianceExplain,
    user: `Explain variance flags with possible causes and checks. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "variance",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
    ],
    cacheTtlMs: 30 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateVarianceExplain,
    fallback: () =>
      fallbackVarianceExplain(
        "Variance insights are unavailable right now. Please try again later.",
      ),
  });

  return Response.json(response);
}
