import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeEntitlementFromBillingMetadata } from "@/lib/billing/entitlement";

export const dynamic = "force-dynamic";

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
  const billing = (metadata.billing ?? {}) as Record<string, unknown>;

  const entitlement = computeEntitlementFromBillingMetadata(billing);

  return Response.json(entitlement);
}

