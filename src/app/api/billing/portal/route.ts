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

  const appUrl = process.env.APP_URL ?? "https://www.pourdex.com";
  const metadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const billing = (metadata.billing ?? {}) as Record<string, unknown>;
  const customerId = billing.stripe_customer_id as string | undefined;

  if (!customerId) {
    return new Response("No Stripe customer found", { status: 400 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error", err);
    return new Response(
      err instanceof Error ? err.message : "Failed to create portal session",
      { status: 500 },
    );
  }
}
