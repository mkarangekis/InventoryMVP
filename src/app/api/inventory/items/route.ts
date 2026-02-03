import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoInventoryItems, isDemoEmail } from "@/lib/demo";

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

  if (isDemoEmail(userData.user.email)) {
    return Response.json({ items: demoInventoryItems });
  }

  const userId = userData.user.id;

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return Response.json({ items: [] });
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  const items = await supabaseAdmin
    .from("inventory_items")
    .select("id,location_id,name_override,ingredient_id,container_type,container_size_oz")
    .in("location_id", scopedLocationIds)
    .eq("is_active", 1)
    .order("id", { ascending: true });

  if (items.error) {
    return new Response(items.error.message, { status: 500 });
  }

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

  const response = (items.data ?? []).map((row) => ({
    id: row.id,
    location_id: row.location_id,
    name: row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
    container_type: row.container_type,
    container_size_oz: row.container_size_oz,
  }));

  return Response.json({ items: response });
}
