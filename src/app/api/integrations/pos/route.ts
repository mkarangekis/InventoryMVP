import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";
import { randomBytes } from "crypto";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Missing auth token", { status: 401 });

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return new Response("Invalid auth token", { status: 401 });

  if (isDemoEmail(userData.user.email)) {
    return Response.json({
      connections: [
        { id: "demo-toast", pos_type: "toast", status: "active", location_id: "demo-loc", sftp_username: "demo_bar_01", last_import_at: new Date(Date.now() - 86400000).toISOString() },
        { id: "demo-square", pos_type: "square", status: "active", location_id: "demo-loc", square_merchant_id: "DEMO_MERCHANT", last_import_at: new Date(Date.now() - 7200000).toISOString() },
      ],
    });
  }

  const userId = userData.user.id;
  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((r) => r.location_id);
  if (locationIds.length === 0) return Response.json({ connections: [] });

  const { data, error: fetchError } = await supabaseAdmin
    .from("pos_connections")
    .select("id,location_id,pos_type,status,sftp_username,sftp_path,ingest_email,square_merchant_id,square_location_id,last_file_received_at,last_import_at,last_error,files_received_total,created_at")
    .in("location_id", locationIds)
    .order("created_at", { ascending: false });

  if (fetchError) return new Response(fetchError.message, { status: 500 });

  return Response.json({ connections: data });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Missing auth token", { status: 401 });

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return new Response("Invalid auth token", { status: 401 });

  if (isDemoEmail(userData.user.email)) {
    return Response.json({ ok: true, message: "Demo: connection created." });
  }

  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const { locationId, posType } = body as { locationId?: string; posType?: string };
  if (!locationId || !posType) return new Response("Missing locationId or posType", { status: 400 });

  const validTypes = ["toast", "skytab", "square"];
  if (!validTypes.includes(posType)) return new Response("Invalid posType", { status: 400 });

  const userId = userData.user.id;
  const profile = await supabaseAdmin.from("user_profiles").select("tenant_id").eq("id", userId).single();
  if (profile.error || !profile.data?.tenant_id) return new Response("User profile not found", { status: 403 });

  const locationAccess = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (!locationAccess.data) return new Response("No access to location", { status: 403 });

  const tenantId = profile.data.tenant_id as string;
  const ingestDomain = process.env.INGEST_EMAIL_DOMAIN ?? "ingest.pourdex.com";

  // Provision credentials based on POS type
  const patch: Record<string, unknown> = {
    tenant_id: tenantId,
    location_id: locationId,
    pos_type: posType,
    status: "pending",
  };

  if (posType === "toast") {
    const username = `bar_${randomBytes(4).toString("hex")}`;
    const password = randomBytes(16).toString("base64url");
    patch.sftp_username = username;
    patch.sftp_password = password;
    patch.sftp_path = `/uploads/${username}/`;
  }

  if (posType === "skytab") {
    const localPart = `${tenantId.slice(0, 8)}_${locationId.slice(0, 8)}`;
    patch.ingest_email = `${localPart}@${ingestDomain}`;
  }

  const { data, error: insertError } = await supabaseAdmin
    .from("pos_connections")
    .upsert(patch, { onConflict: "location_id,pos_type" })
    .select()
    .single();

  if (insertError) return new Response(insertError.message, { status: 500 });

  return Response.json({ ok: true, connection: data });
}
