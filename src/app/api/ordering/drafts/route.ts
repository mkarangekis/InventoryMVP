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
    return Response.json({ purchaseOrders: [] });
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  const pos = await supabaseAdmin
    .from("purchase_orders")
    .select("id,vendor_id,location_id,status,created_at")
    .eq("status", "draft")
    .in("location_id", scopedLocationIds)
    .order("created_at", { ascending: false });

  if (pos.error) {
    return new Response(pos.error.message, { status: 500 });
  }

  const poIds = (pos.data ?? []).map((row) => row.id);
  const vendorIds = Array.from(new Set((pos.data ?? []).map((row) => row.vendor_id)));

  const lines = poIds.length
    ? await supabaseAdmin
        .from("purchase_order_lines")
        .select("purchase_order_id,inventory_item_id,qty_units,unit_price,line_total")
        .in("purchase_order_id", poIds)
    : { data: [] };

  const vendors = vendorIds.length
    ? await supabaseAdmin.from("vendors").select("id,name,email").in("id", vendorIds)
    : { data: [] };

  const inventoryItemIds = Array.from(
    new Set((lines.data ?? []).map((row) => row.inventory_item_id)),
  );

  const items = inventoryItemIds.length
    ? await supabaseAdmin
        .from("inventory_items")
        .select("id,name_override,ingredient_id")
        .in("id", inventoryItemIds)
    : { data: [] };

  const ingredientIds = Array.from(
    new Set((items.data ?? []).map((row) => row.ingredient_id)),
  );

  const ingredients = ingredientIds.length
    ? await supabaseAdmin.from("ingredients").select("id,name").in("id", ingredientIds)
    : { data: [] };

  const ingredientMap = new Map<string, string>();
  for (const row of ingredients.data ?? []) {
    ingredientMap.set(row.id, row.name);
  }

  const itemMap = new Map(
    (items.data ?? []).map((row) => [
      row.id,
      row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
    ]),
  );

  const vendorMap = new Map(
    (vendors.data ?? []).map((row) => [row.id, row]),
  );

  const linesByPo = new Map<string, any[]>();
  for (const line of lines.data ?? []) {
    const list = linesByPo.get(line.purchase_order_id) ?? [];
    list.push({
      ...line,
      item_name: itemMap.get(line.inventory_item_id) ?? "Unknown",
    });
    linesByPo.set(line.purchase_order_id, list);
  }

  const purchaseOrders = (pos.data ?? []).map((po) => ({
    ...po,
    vendor: vendorMap.get(po.vendor_id) ?? null,
    lines: linesByPo.get(po.id) ?? [],
  }));

  return Response.json({ purchaseOrders });
}
