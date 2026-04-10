import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  computeEntitlementFromBillingMetadata,
  type Entitlement,
} from "@/lib/billing/entitlement";
import { isDemoEmail } from "@/lib/demo";

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

  if (isDemoEmail(userData.user.email)) {
    const entitlement: Entitlement = {
      entitlementStatus: "trialing",
      entitlementSource: "mock",
      trialEnd: null,
      currentPeriodEnd: null,
      customerId: null,
      subscriptionId: null,
      billingStatusRaw: "demo",
    };

    return Response.json(entitlement);
  }

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, any>;
  const billing = (metadata.billing ?? {}) as Record<string, unknown>;

  const entitlement = computeEntitlementFromBillingMetadata(billing);

  return Response.json(entitlement);
}
