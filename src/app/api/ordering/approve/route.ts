import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const body = await request.json();
  const purchaseOrderId = String(body.purchaseOrderId ?? "").trim();

  if (!purchaseOrderId) {
    return new Response("Missing purchaseOrderId", { status: 400 });
  }

  const userId = userData.user.id;

  const po = await supabaseAdmin
    .from("purchase_orders")
    .select("id,location_id,status,tenant_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (!po.data) {
    return new Response("Purchase order not found", { status: 404 });
  }

  if (po.data.status !== "draft") {
    return new Response("Purchase order already approved", { status: 400 });
  }

  const access = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", po.data.location_id)
    .maybeSingle();

  if (!access.data) {
    return new Response("No access to location", { status: 403 });
  }

  const update = await supabaseAdmin
    .from("purchase_orders")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: userId,
    })
    .eq("id", purchaseOrderId)
    .select("id")
    .single();

  if (update.error) {
    return new Response(update.error.message, { status: 500 });
  }

  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: po.data.tenant_id,
    location_id: po.data.location_id,
    user_id: userId,
    action: "approve_po",
    entity_type: "purchase_orders",
    entity_id: purchaseOrderId,
    details: {},
  });

  console.info("purchase order approved", { purchaseOrderId, userId });

  return Response.json({ ok: true, purchaseOrderId });
}
