export type EntitlementStatus =
  | "active"
  | "trialing"
  | "inactive"
  | "past_due"
  | "canceled"
  | "unknown";

export type EntitlementSource = "stripe" | "db" | "mock";

export type Entitlement = {
  entitlementStatus: EntitlementStatus;
  entitlementSource: EntitlementSource;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  stripeStatusRaw: string | null;
};

export const isEntitledStatus = (status: EntitlementStatus) =>
  status === "active" || status === "trialing";

const isFutureIsoDate = (value: unknown, nowMs: number) => {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return false;
  return t > nowMs;
};

const normalizeStripeStatus = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length ? v : null;
};

export function computeEntitlementFromBillingMetadata(
  billing: Record<string, unknown>,
  now = new Date(),
): Entitlement {
  const stripeStatusRaw = normalizeStripeStatus(billing.stripe_status);
  const trialEnd = typeof billing.trial_ends_at === "string" ? billing.trial_ends_at : null;
  const currentPeriodEnd =
    typeof billing.current_period_end === "string"
      ? billing.current_period_end
      : null;

  const customerId =
    typeof billing.stripe_customer_id === "string"
      ? billing.stripe_customer_id
      : null;
  const subscriptionId =
    typeof billing.stripe_subscription_id === "string"
      ? billing.stripe_subscription_id
      : null;

  // Default to db because current implementation stores billing in Supabase user_metadata.
  const entitlementSource: EntitlementSource = "db";

  if (!stripeStatusRaw) {
    return {
      entitlementStatus: "unknown",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      stripeStatusRaw,
    };
  }

  // Treat an unexpired trial as trialing even if status is stale.
  const nowMs = now.getTime();
  const hasLiveTrial = isFutureIsoDate(trialEnd, nowMs);

  if (stripeStatusRaw === "active") {
    return {
      entitlementStatus: "active",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      stripeStatusRaw,
    };
  }

  if (stripeStatusRaw === "trialing" || hasLiveTrial) {
    return {
      entitlementStatus: "trialing",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      stripeStatusRaw,
    };
  }

  if (stripeStatusRaw === "past_due" || stripeStatusRaw === "unpaid") {
    return {
      entitlementStatus: "past_due",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      stripeStatusRaw,
    };
  }

  if (stripeStatusRaw === "canceled" || stripeStatusRaw === "cancelled") {
    return {
      entitlementStatus: "canceled",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      stripeStatusRaw,
    };
  }

  // Incomplete, incomplete_expired, paused, etc.
  return {
    entitlementStatus: "inactive",
    entitlementSource,
    trialEnd,
    currentPeriodEnd,
    customerId,
    subscriptionId,
    stripeStatusRaw,
  };
}
