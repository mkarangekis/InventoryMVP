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

  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.APP_URL;

  if (!priceId) {
    return new Response("STRIPE_PRICE_ID is not set", { status: 500 });
  }
  if (!appUrl) {
    return new Response("APP_URL is not set", { status: 500 });
  }

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, any>;
  const billing = (metadata.billing ?? {}) as Record<string, any>;
  const existingCustomerId = billing.stripe_customer_id as string | undefined;

  const customerId =
    existingCustomerId ??
    (
      await stripe.customers.create({
        email: userData.user.email ?? undefined,
        metadata: {
          user_id: userData.user.id,
        },
      })
    ).id;

  if (!existingCustomerId) {
    await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
      user_metadata: {
        ...metadata,
        billing: {
          ...(billing ?? {}),
          stripe_customer_id: customerId,
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userData.user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        user_id: userData.user.id,
      },
    },
    success_url: `${appUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings?billing=cancel`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
