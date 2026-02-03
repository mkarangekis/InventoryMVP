import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEMO_LOCATION_ID, DEMO_TENANT_ID, isDemoEmail } from "@/lib/demo";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
    token,
  );

  if (userError || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  if (isDemoEmail(userData.user.email)) {
    return Response.json({
      ok: true,
      tenantId: DEMO_TENANT_ID,
      locationId: DEMO_LOCATION_ID,
      userId: userData.user.id,
      existing: true,
    });
  }

  const body = await request.json();
  const tenantName = String(body.tenantName ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const address = String(body.address ?? "").trim();
  const timezone = String(body.timezone ?? "").trim();

  if (!tenantName || !locationName || !address || !timezone) {
    return new Response("Missing required fields", { status: 400 });
  }

  const userId = userData.user.id;
  const email = userData.user.email ?? "unknown";

  const existingProfile = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile.data) {
    return Response.json({ ok: true, userId, existing: true });
  }

  const tenantInsert = await supabaseAdmin
    .from("tenants")
    .insert({ name: tenantName })
    .select("id")
    .single();

  if (tenantInsert.error) {
    return new Response(tenantInsert.error.message, { status: 500 });
  }

  const tenantId = tenantInsert.data.id;

  const locationInsert = await supabaseAdmin
    .from("locations")
    .insert({
      tenant_id: tenantId,
      name: locationName,
      address,
      timezone,
    })
    .select("id")
    .single();

  if (locationInsert.error) {
    return new Response(locationInsert.error.message, { status: 500 });
  }

  const locationId = locationInsert.data.id;

  const profileInsert = await supabaseAdmin.from("user_profiles").insert({
    id: userId,
    tenant_id: tenantId,
    email,
    role: "owner",
  });

  if (profileInsert.error) {
    return new Response(profileInsert.error.message, { status: 500 });
  }

  const userLocationInsert = await supabaseAdmin.from("user_locations").insert({
    user_id: userId,
    location_id: locationId,
  });

  if (userLocationInsert.error) {
    return new Response(userLocationInsert.error.message, { status: 500 });
  }

  return Response.json({ ok: true, tenantId, locationId, userId });
}
