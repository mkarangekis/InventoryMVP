import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

export async function POST(request: Request) {
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
    return Response.json({ ok: true, specId: "demo-spec-001", version: 1 });
  }

  const body = await request.json();
  const locationId = String(body.locationId ?? "").trim();
  const menuItemId = String(body.menuItemId ?? "").trim();
  const glassType = String(body.glassType ?? "").trim();
  const iceType = String(body.iceType ?? "").trim();
  const targetPourOz = Number.parseFloat(String(body.targetPourOz ?? "0"));
  const notes = String(body.notes ?? "").trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!locationId || !menuItemId || !glassType || !iceType || targetPourOz <= 0) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (lines.length === 0) {
    return new Response("Spec lines are required", { status: 400 });
  }

  const userId = userData.user.id;

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile.data) {
    return new Response("User profile not found", { status: 403 });
  }

  const tenantId = profile.data.tenant_id as string;

  const access = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (!access.data) {
    return new Response("No access to location", { status: 403 });
  }

  const existing = await supabaseAdmin
    .from("drink_specs")
    .select("id,version")
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("menu_item_id", menuItemId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existing.data?.[0]?.version ?? 0) + 1;

  await supabaseAdmin
    .from("drink_specs")
    .update({ active: 0 })
    .eq("tenant_id", tenantId)
    .eq("location_id", locationId)
    .eq("menu_item_id", menuItemId)
    .eq("active", 1);

  const specInsert = await supabaseAdmin
    .from("drink_specs")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      menu_item_id: menuItemId,
      version: nextVersion,
      glass_type: glassType,
      ice_type: iceType,
      target_pour_oz: targetPourOz,
      notes,
      active: 1,
    })
    .select("id")
    .single();

  if (specInsert.error) {
    return new Response(specInsert.error.message, { status: 500 });
  }

  const specId = specInsert.data.id as string;

  const lineRows = lines.map((line: { ingredientId: string; ounces: number }) => ({
    tenant_id: tenantId,
    drink_spec_id: specId,
    ingredient_id: String(line.ingredientId),
    ounces: Number.parseFloat(String(line.ounces ?? 0)),
  }));

  const lineInsert = await supabaseAdmin
    .from("drink_spec_lines")
    .insert(lineRows);

  if (lineInsert.error) {
    return new Response(lineInsert.error.message, { status: 500 });
  }

  console.info("drink spec created", { specId, menuItemId, locationId });

  return Response.json({ ok: true, specId, version: nextVersion });
}
