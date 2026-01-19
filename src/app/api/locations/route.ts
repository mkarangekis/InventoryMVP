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
    .select("locations(id,name)")
    .eq("user_id", userId);

  const mapped =
    locations.data?.flatMap((row: { locations?: { id: string; name: string } }) =>
      row.locations ? [{ id: row.locations.id, name: row.locations.name }] : [],
    ) ?? [];

  return Response.json({ locations: mapped });
}