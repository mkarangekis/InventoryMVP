import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response("Missing webhook signature", { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return new Response("Invalid signature", { status: 400 });
  }

  const updateUserBilling = async (
    userId: string,
    billing: Record<string, any>,
  ) => {
    const { data } = await supabaseAdmin.auth.getUserById(userId);
    const metadata = (data.user?.user_metadata ?? {}) as Record<string, any>;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...metadata,
        billing: {
          ...(metadata.billing ?? {}),
          ...billing,
        },
      },
    });
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.client_reference_id as string | undefined;
    if (userId) {
      await updateUserBilling(userId, {
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_status: "trialing",
      });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.user_id as string | undefined;
    if (userId) {
      await updateUserBilling(userId, {
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_status: subscription.status,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription as string | undefined;
    const customerId = invoice.customer as string | undefined;
    if (subscriptionId || customerId) {
      const userList = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const user = userList.data.users.find((item) => {
        const billing = (item.user_metadata?.billing ?? {}) as Record<string, any>;
        return (
          billing.stripe_subscription_id === subscriptionId ||
          billing.stripe_customer_id === customerId
        );
      });
      if (user) {
        await updateUserBilling(user.id, {
          stripe_status: "past_due",
        });
      }
    }
  }

  return new Response("ok", { status: 200 });
}
