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
    return Response.json({ items: [] });
  }

  const items = await supabaseAdmin
    .from("menu_items")
    .select("id,name,location_id")
    .in("location_id", locationIds)
    .eq("is_active", 1)
    .order("name", { ascending: true });

  if (items.error) {
    return new Response(items.error.message, { status: 500 });
  }

  return Response.json({ items: items.data ?? [] });
}