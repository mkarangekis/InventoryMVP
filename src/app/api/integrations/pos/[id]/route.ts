import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

async function getAuthedConnection(request: Request, id: string) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: new Response("Missing auth token", { status: 401 }) };

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return { error: new Response("Invalid auth token", { status: 401 }) };

  if (isDemoEmail(userData.user.email)) return { demo: true };

  const userId = userData.user.id;
  const locations = await supabaseAdmin.from("user_locations").select("location_id").eq("user_id", userId);
  const locationIds = (locations.data ?? []).map((r) => r.location_id);

  const { data, error: fetchError } = await supabaseAdmin
    .from("pos_connections")
    .select("*")
    .eq("id", id)
    .in("location_id", locationIds)
    .single();

  if (fetchError || !data) return { error: new Response("Not found", { status: 404 }) };
  return { connection: data };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getAuthedConnection(request, id);
  if (result.error) return result.error;
  if (result.demo) return Response.json({ connection: null });
  return Response.json({ connection: result.connection });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getAuthedConnection(request, id);
  if (result.error) return result.error;
  if (result.demo) return Response.json({ ok: true });

  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const allowed = ["status", "square_location_id", "sftp_path"];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("pos_connections")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true, connection: data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await getAuthedConnection(request, id);
  if (result.error) return result.error;
  if (result.demo) return Response.json({ ok: true });

  const { error } = await supabaseAdmin.from("pos_connections").delete().eq("id", id);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
