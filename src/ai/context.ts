import { supabaseAdmin } from "@/lib/supabase/admin";

type UserScope =
  | {
      ok: true;
      userId: string;
      tenantId: string | null;
      locationIds: string[];
      scopedLocationIds: string[];
      locationId: string | null;
    }
  | { ok: false; response: Response };

export const getUserScope = async (request: Request): Promise<UserScope> => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { ok: false, response: new Response("Missing auth token", { status: 401 }) };
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) {
    return { ok: false, response: new Response("Invalid auth token", { status: 401 }) };
  }

  const userId = userData.user.id;
  const locationRows = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locationRows.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return {
      ok: true,
      userId,
      tenantId: null,
      locationIds,
      scopedLocationIds: [],
      locationId: null,
    };
  }

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  return {
    ok: true,
    userId,
    tenantId: profile.data?.tenant_id ?? null,
    locationIds,
    scopedLocationIds,
    locationId: requestedLocation ?? null,
  };
};
