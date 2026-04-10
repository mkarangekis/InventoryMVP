import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createQbCustomer,
  createQbInvoice,
  sendQbInvoice,
} from "@/lib/quickbooks-api";

const TRIAL_DAYS = 14;
const SUBSCRIPTION_PRICE = parseFloat(process.env.QB_SUBSCRIPTION_PRICE ?? "99");

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
  const realmId = process.env.QB_REALM_ID;

  if (!realmId) {
    return new Response("QB_REALM_ID is not set", { status: 500 });
  }

  const user = userData.user;
  const email = user.email ?? "";
  const displayName = (user.user_metadata?.full_name as string | undefined)
    ?? email.split("@")[0]
    ?? user.id;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const billing = (metadata.billing ?? {}) as Record<string, unknown>;

  // ── If already trialing or active, redirect to portal instead ──
  const existingStatus = billing.qb_status as string | undefined;
  if (existingStatus === "active" || existingStatus === "trialing") {
    return Response.json({
      url: `${appUrl}/settings?billing=already-active`,
    });
  }

  try {
    // ── 1. Create QB Customer (or reuse existing) ──────────────────────────
    let qbCustomerId = billing.qb_customer_id as string | undefined;

    if (!qbCustomerId) {
      const customer = await createQbCustomer(displayName, email);
      qbCustomerId = customer.Id;
    }

    // ── 2. Trial period: 14 days from now ─────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    const trialEndIso = trialEnd.toISOString();

    // ── 3. Create QB Invoice due at end of trial ───────────────────────────
    //    QB does NOT auto-charge — it emails the customer a "Pay Now" link.
    //    The customer pays before the due date to stay active.
    const invoice = await createQbInvoice(
      qbCustomerId,
      SUBSCRIPTION_PRICE,
      trialEndIso,
    );

    // ── 4. Email the invoice to the customer via QB ────────────────────────
    if (email) {
      await sendQbInvoice(invoice.Id, email);
    }

    // ── 5. Store billing state in Supabase user metadata ──────────────────
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
        billing: {
          ...(billing ?? {}),
          qb_customer_id: qbCustomerId,
          qb_invoice_id: invoice.Id,
          qb_realm_id: realmId,
          qb_status: "trialing",
          trial_ends_at: trialEndIso,
          // current_period_end will be set by QB webhook when payment is confirmed
        },
      },
    });

    // Redirect to onboarding — trial has started, invoice sent via email
    return Response.json({
      url: `${appUrl}/onboarding?trial=started`,
    });
  } catch (err) {
    console.error("QB checkout error", err);
    return new Response(
      err instanceof Error ? err.message : "Failed to start trial",
      { status: 500 },
    );
  }
}
