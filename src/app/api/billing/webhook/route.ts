import { headers } from "next/headers";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

const updateUserBilling = async (
  userId: string,
  billing: Record<string, unknown>,
) => {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...metadata,
      billing: {
        ...(metadata.billing as Record<string, unknown> ?? {}),
        ...billing,
      },
    },
  });
};

const findUserByCustomerId = async (customerId: string) => {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  return (
    data.users.find((u) => {
      const billing = (u.user_metadata?.billing ?? {}) as Record<string, unknown>;
      return billing.stripe_customer_id === customerId;
    }) ?? null
  );
};

export async function POST(request: Request) {
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response("STRIPE_WEBHOOK_SECRET is not set", { status: 500 });
  }

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Find user by email if not yet linked
        let user = await findUserByCustomerId(customerId);
        if (!user && session.customer_details?.email) {
          const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          user = data.users.find((u) => u.email === session.customer_details?.email) ?? null;
        }
        if (!user) break;

        await updateUserBilling(user.id, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_status: "trialing",
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await updateUserBilling(user.id, {
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          stripe_status: sub.status,
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await updateUserBilling(user.id, {
          stripe_status: "canceled",
          stripe_subscription_id: sub.id,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

        await updateUserBilling(user.id, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          stripe_status: "active",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await updateUserBilling(user.id, {
          stripe_status: "past_due",
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
