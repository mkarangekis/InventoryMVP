import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const userId = userData.user.id;

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return Response.json({ flags: [] });
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  const flags = await supabaseAdmin
    .from("variance_flags")
    .select(
      "id,week_start_date,inventory_item_id,expected_remaining_oz,actual_remaining_oz,variance_oz,variance_pct,severity,location_id",
    )
    .in("location_id", scopedLocationIds)
    .order("week_start_date", { ascending: false })
    .order("severity", { ascending: false })
    .limit(50);

  if (flags.error) {
    return new Response(flags.error.message, { status: 500 });
  }

  const itemIds = Array.from(
    new Set((flags.data ?? []).map((row) => row.inventory_item_id)),
  );

  let itemMap = new Map<string, string>();
  if (itemIds.length > 0) {
    const items = await supabaseAdmin
      .from("inventory_items")
      .select("id,name_override,ingredient_id")
      .in("id", itemIds);

    const ingredientIds = Array.from(
      new Set((items.data ?? []).map((row) => row.ingredient_id)),
    );

    const ingredients = ingredientIds.length
      ? await supabaseAdmin
          .from("ingredients")
          .select("id,name")
          .in("id", ingredientIds)
      : { data: [] };

    const ingredientMap = new Map<string, string>();
    for (const ingredient of ingredients.data ?? []) {
      ingredientMap.set(ingredient.id, ingredient.name);
    }

    itemMap = new Map(
      (items.data ?? []).map((row) => [
        row.id,
        row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
      ]),
    );
  }

  const response = (flags.data ?? []).map((row) => ({
    ...row,
    item_name: itemMap.get(row.inventory_item_id) ?? "Unknown",
  }));

  return Response.json({ flags: response });
}
