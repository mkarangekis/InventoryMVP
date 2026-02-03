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

  type Location = { id: string; name: string };
  type UserLocationRow = { locations: Location | Location[] | null };

  const mapped =
    (locations.data as UserLocationRow[] | null)
      ?.flatMap((row) => {
        if (!row.locations) {
          return [];
        }
        return Array.isArray(row.locations) ? row.locations : [row.locations];
      })
      .map((location) => ({ id: location.id, name: location.name })) ?? [];

  return Response.json({ locations: mapped });
}
