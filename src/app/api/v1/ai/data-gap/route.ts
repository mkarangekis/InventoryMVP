import { aiFeatureFlags } from "@/config/aiFlags";
import { getUserScope } from "@/ai/context";
import { fallbackDataGap } from "@/ai/fallbacks";
import { systemPrompts } from "@/ai/prompts";
import { runAiFeature, hashInput } from "@/ai/run";
import { validateDataGap } from "@/ai/validators";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoAiDataGap } from "@/lib/demo";

const daysAgo = (count: number) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString();
};

export async function GET(request: Request) {
  const scope = await getUserScope(request);
  if (!scope.ok) return scope.response;

  if (scope.isDemo) {
    return Response.json(demoAiDataGap);
  }

  if (!aiFeatureFlags.dataGap()) {
    return new Response("Not found", { status: 404 });
  }

  if (scope.scopedLocationIds.length === 0) {
    return Response.json(
      fallbackDataGap("No locations available for data gap analysis."),
    );
  }

  const since = daysAgo(30);

  const vendorPromise = scope.tenantId
    ? supabaseAdmin
        .from("vendors")
        .select("id")
        .in("tenant_id", [scope.tenantId])
    : Promise.resolve({ data: [] as { id: string }[] });

  const [orders, specs, snapshots, forecasts, vendors] = await Promise.all([
    supabaseAdmin
      .from("pos_orders")
      .select("id")
      .in("location_id", scope.scopedLocationIds)
      .gte("closed_at", since),
    supabaseAdmin
      .from("drink_specs")
      .select("id")
      .in("location_id", scope.scopedLocationIds)
      .eq("active", 1),
    supabaseAdmin
      .from("inventory_snapshots")
      .select("id")
      .in("location_id", scope.scopedLocationIds)
      .gte("snapshot_date", since),
    supabaseAdmin
      .from("demand_forecasts_daily")
      .select("id")
      .in("location_id", scope.scopedLocationIds)
      .gte("forecast_date", since),
    vendorPromise,
  ]);

  const input = {
    recent_orders: (orders.data ?? []).length,
    active_specs: (specs.data ?? []).length,
    inventory_counts: (snapshots.data ?? []).length,
    forecasts: (forecasts.data ?? []).length,
    vendors: (vendors.data ?? []).length,
  };

  const response = await runAiFeature({
    feature: "data_gap",
    system: systemPrompts.dataGap,
    user: `Identify data gaps that block better recommendations. Input: ${JSON.stringify(
      input,
    )}`,
    model: process.env.OPENAI_MODEL_SMALL ?? "gpt-4o-mini",
    cacheKeyParts: [
      "gap",
      scope.tenantId,
      scope.locationId ?? scope.scopedLocationIds.join(","),
      since,
    ],
    cacheTtlMs: 12 * 60 * 60_000,
    inputHash: hashInput(input),
    tenantId: scope.tenantId,
    locationId: scope.locationId,
    userId: scope.userId,
    validate: validateDataGap,
    fallback: () =>
      fallbackDataGap(
        "Data gap advisor is unavailable right now. Please try again later.",
      ),
  });

  return Response.json(response);
}
