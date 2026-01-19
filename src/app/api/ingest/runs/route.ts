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
  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (profile.error || !profile.data?.tenant_id) {
    return new Response("User profile not found", { status: 403 });
  }

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return Response.json({ runs: [] });
  }

  const runs = await supabaseAdmin
    .from("pos_import_runs")
    .select(
      "id,location_id,source,status,started_at,finished_at,error_summary",
    )
    .eq("tenant_id", profile.data.tenant_id)
    .in("location_id", locationIds)
    .order("started_at", { ascending: false })
    .limit(10);

  if (runs.error) {
    return new Response(runs.error.message, { status: 500 });
  }

  const locationRows = await supabaseAdmin
    .from("locations")
    .select("id,name")
    .in("id", locationIds);

  const locationMap = new Map<string, string>();
  for (const location of locationRows.data ?? []) {
    locationMap.set(location.id, location.name);
  }

  const payload = (runs.data ?? []).map((run) => ({
    ...run,
    location_name: locationMap.get(run.location_id) ?? "Unknown",
  }));

  return Response.json({ runs: payload });
}
