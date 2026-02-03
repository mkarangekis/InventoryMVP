import { stripe } from "@/lib/stripe";
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

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return new Response("APP_URL is not set", { status: 500 });
  }

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, any>;
  const billing = (metadata.billing ?? {}) as Record<string, any>;
  const customerId = billing.stripe_customer_id as string | undefined;

  if (!customerId) {
    return new Response("No Stripe customer found", { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings?billing=manage`,
  });

  return Response.json({ url: session.url });
}
