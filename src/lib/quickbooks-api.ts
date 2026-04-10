/**
 * QuickBooks API client.
 *
 * IMPORTANT — capability differences vs. Stripe:
 *
 * Stripe:  subscription engine lives inside Stripe. It auto-charges the card on
 *          file, retries failed payments, and fires webhook events for every
 *          lifecycle change (created → trialing → active → past_due → canceled).
 *
 * QB:      QB creates Invoices and receives Payments. It does NOT auto-charge a
 *          stored card on file (unless you also integrate QB Payments tokenization,
 *          which is a separate product). QB recurring transactions auto-generate
 *          invoices monthly, but the customer must still click "Pay" from the
 *          invoice email. Non-payment is NOT automatically pushed to us via webhook
 *          — QB only fires events when something actively changes (payment received,
 *          invoice voided, etc.). We therefore:
 *            1. Track trial_ends_at ourselves in Supabase.
 *            2. Compute "trial expired, unpaid → past_due" in entitlement.ts.
 *            3. Rely on the QB webhook for payment confirmation → "active".
 *            4. Rely on invoice void/delete webhook → "canceled".
 */

const QB_API_BASE =
  process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

const QB_OAUTH_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

/** Exchange the stored refresh token for a fresh access token. */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const refreshToken = process.env.QB_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "QB OAuth env vars not set: QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REFRESH_TOKEN",
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const res = await fetch(QB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`QB token refresh failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // NOTE: QB issues a new refresh_token on every refresh (100-day rolling window).
  // In production you must persist data.refresh_token back to your secret store
  // (e.g. Vercel env var update via Vercel API, or a secrets table in Supabase).
  // For now we log a warning so it is not silently lost.
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    console.warn(
      "QB issued a new refresh_token — update QB_REFRESH_TOKEN in your environment: " +
        data.refresh_token,
    );
  }

  return data.access_token;
}

/** Low-level authenticated QB API call. */
async function qbFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const realmId = process.env.QB_REALM_ID;
  if (!realmId) throw new Error("QB_REALM_ID is not set");

  const accessToken = await getAccessToken();
  const url = `${QB_API_BASE}/v3/company/${realmId}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`QB API error (${res.status}) ${path}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export type QbCustomer = { Id: string; DisplayName: string };

/** Create a new QB Customer and return its Id. */
export async function createQbCustomer(
  displayName: string,
  email: string,
): Promise<QbCustomer> {
  const data = await qbFetch<{ Customer: QbCustomer }>("/customer", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: displayName,
      PrimaryEmailAddr: { Address: email },
    }),
  });
  return data.Customer;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export type QbInvoice = {
  Id: string;
  DocNumber: string;
  DueDate: string;
  Balance: number;
};

/**
 * Create a subscription invoice for a QB customer.
 * @param qbCustomerId  The QB Customer.Id
 * @param amountDue     Monthly subscription price in dollars
 * @param dueDateIso    ISO date string for when payment is due (end of trial)
 */
export async function createQbInvoice(
  qbCustomerId: string,
  amountDue: number,
  dueDateIso: string,
): Promise<QbInvoice> {
  const itemId = process.env.QB_SUBSCRIPTION_ITEM_ID ?? "1";

  const data = await qbFetch<{ Invoice: QbInvoice }>("/invoice", {
    method: "POST",
    body: JSON.stringify({
      CustomerRef: { value: qbCustomerId },
      DueDate: dueDateIso.split("T")[0], // QB expects YYYY-MM-DD
      Line: [
        {
          Amount: amountDue,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: { value: itemId },
            Qty: 1,
            UnitPrice: amountDue,
          },
        },
      ],
      // Let QB auto-create a RecurringTransaction so subsequent months are handled
      // Configure this via QB Online settings once the first invoice is created.
    }),
  });
  return data.Invoice;
}

/**
 * Send the invoice to the customer via email (QB-hosted payment page link).
 * QB emails the customer with a "Pay Now" button — this is the QB equivalent
 * of Stripe's hosted checkout, but the customer must actively click to pay.
 */
export async function sendQbInvoice(
  invoiceId: string,
  email: string,
): Promise<void> {
  await qbFetch(
    `/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(email)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: "",
    },
  );
}

/** Fetch an invoice by ID (used to check payment status on demand). */
export async function getQbInvoice(invoiceId: string): Promise<QbInvoice> {
  const data = await qbFetch<{ Invoice: QbInvoice }>(`/invoice/${invoiceId}`);
  return data.Invoice;
}
