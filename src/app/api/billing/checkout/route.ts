import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

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
  const appUrl = process.env.APP_URL ?? "https://www.pourdex.com";

  if (!priceId) {
    return new Response("STRIPE_PRICE_ID is not set", { status: 500 });
  }

  const user = userData.user;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const billing = (metadata.billing ?? {}) as Record<string, unknown>;

  // If already active or trialing, redirect to portal
  const existingStatus = billing.stripe_status as string | undefined;
  if (existingStatus === "active" || existingStatus === "trialing") {
    return Response.json({ url: `${appUrl}/settings?billing=already-active` });
  }

  try {
    // Reuse existing Stripe customer if present
    let customerId = billing.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: (user.user_metadata?.full_name as string | undefined) ?? undefined,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;

      // Persist customer ID immediately so we can match webhooks
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...metadata,
          billing: { ...(billing ?? {}), stripe_customer_id: customerId },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: `${appUrl}/onboarding?trial=started`,
      cancel_url: `${appUrl}/settings?billing=canceled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    return new Response(
      err instanceof Error ? err.message : "Failed to create checkout session",
      { status: 500 },
    );
  }
}
