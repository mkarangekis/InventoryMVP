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

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, any>;
  const billing = (metadata.billing ?? {}) as Record<string, any>;

  return Response.json({
    qb_customer_id: billing.qb_customer_id ?? null,
    qb_invoice_id: billing.qb_invoice_id ?? null,
    qb_realm_id: billing.qb_realm_id ?? null,
    qb_status: billing.qb_status ?? null,
    trial_ends_at: billing.trial_ends_at ?? null,
    current_period_end: billing.current_period_end ?? null,
  });
}
