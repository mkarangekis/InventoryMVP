import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

type NeedVsOnhandResponse = {
  snapshotDate: string | null;
  items: {
    inventory_item_id: string;
    item_name: string;
    on_hand_oz: number;
    forecast_next_14d_oz: number;
  }[];
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  // Demo mode: this endpoint is best-effort; return empty.
  if (isDemoEmail(userData.user.email)) {
    const empty: NeedVsOnhandResponse = { snapshotDate: null, items: [] };
    return Response.json(empty);
  }

  const userId = userData.user.id;
  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    const empty: NeedVsOnhandResponse = { snapshotDate: null, items: [] };
    return Response.json(empty);
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const locationId =
    requestedLocation && locationIds.includes(requestedLocation)
      ? requestedLocation
      : locationIds[0];

  const latestSnapshot = await supabaseAdmin
    .from("inventory_snapshots")
    .select("id,snapshot_date")
    .eq("location_id", locationId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshot.error) {
    return new Response(latestSnapshot.error.message, { status: 500 });
  }

  if (!latestSnapshot.data) {
    const empty: NeedVsOnhandResponse = { snapshotDate: null, items: [] };
    return Response.json(empty);
  }

  const snapshotId = latestSnapshot.data.id as string;
  const snapshotDate = String(latestSnapshot.data.snapshot_date ?? "");

  const lines = await supabaseAdmin
    .from("inventory_snapshot_lines")
    .select("inventory_item_id,actual_remaining_oz")
    .eq("snapshot_id", snapshotId);

  if (lines.error) {
    return new Response(lines.error.message, { status: 500 });
  }

  const itemIds = Array.from(
    new Set((lines.data ?? []).map((row) => row.inventory_item_id)),
  );

  const itemsRes = itemIds.length
    ? await supabaseAdmin
        .from("inventory_items")
        .select("id,name_override,ingredient_id")
        .in("id", itemIds)
    : { data: [], error: null as any };

  if ((itemsRes as any).error) {
    return new Response((itemsRes as any).error.message, { status: 500 });
  }

  const ingredientIds = Array.from(
    new Set(((itemsRes as any).data ?? []).map((row: any) => row.ingredient_id)),
  );

  const ingredientsRes = ingredientIds.length
    ? await supabaseAdmin
        .from("ingredients")
        .select("id,name")
        .in("id", ingredientIds)
    : { data: [] };

  const ingredientMap = new Map(
    (ingredientsRes.data ?? []).map((row: any) => [row.id, row.name]),
  );

  const itemNameMap = new Map(
    (((itemsRes as any).data ?? []) as any[]).map((row) => [
      row.id,
      row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
    ]),
  );

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const forecastRes = await supabaseAdmin
    .from("demand_forecasts_daily")
    .select("forecast_date,inventory_item_id,forecast_usage_oz")
    .eq("location_id", locationId)
    .gte("forecast_date", startStr)
    .lte("forecast_date", endStr)
    .limit(2000);

  if (forecastRes.error) {
    return new Response(forecastRes.error.message, { status: 500 });
  }

  const forecastByItem = new Map<string, number>();
  for (const row of forecastRes.data ?? []) {
    const itemId = row.inventory_item_id as string;
    const prev = forecastByItem.get(itemId) ?? 0;
    const v = Number(row.forecast_usage_oz ?? 0);
    forecastByItem.set(itemId, prev + (Number.isFinite(v) ? v : 0));
  }

  const onHandByItem = new Map<string, number>();
  for (const row of lines.data ?? []) {
    const itemId = row.inventory_item_id as string;
    const v = Number(row.actual_remaining_oz ?? 0);
    onHandByItem.set(itemId, Number.isFinite(v) ? v : 0);
  }

  const combined = itemIds.map((id) => ({
    inventory_item_id: id,
    item_name: itemNameMap.get(id) ?? "Unknown",
    on_hand_oz: onHandByItem.get(id) ?? 0,
    forecast_next_14d_oz: forecastByItem.get(id) ?? 0,
  }));

  combined.sort((a, b) => b.forecast_next_14d_oz - a.forecast_next_14d_oz);

  const response: NeedVsOnhandResponse = {
    snapshotDate,
    items: combined.slice(0, 12),
  };

  return Response.json(response);
}

