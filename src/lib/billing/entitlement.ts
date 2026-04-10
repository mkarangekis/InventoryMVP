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
  /** Raw billing status string as received from Stripe. */
  billingStatusRaw: string | null;
};

export const isEntitledStatus = (status: EntitlementStatus) =>
  status === "active" || status === "trialing";

const isFutureIsoDate = (value: unknown, nowMs: number) => {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return false;
  return t > nowMs;
};

const normalizeStatus = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length ? v : null;
};

export function computeEntitlementFromBillingMetadata(
  billing: Record<string, unknown>,
  now = new Date(),
): Entitlement {
  const billingStatusRaw = normalizeStatus(billing.stripe_status);
  const trialEnd =
    typeof billing.trial_ends_at === "string" ? billing.trial_ends_at : null;
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

  const entitlementSource: EntitlementSource = "db";

  if (!billingStatusRaw) {
    return {
      entitlementStatus: "unknown",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      billingStatusRaw,
    };
  }

  const nowMs = now.getTime();
  const hasLiveTrial = isFutureIsoDate(trialEnd, nowMs);

  if (billingStatusRaw === "active") {
    return {
      entitlementStatus: "active",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      billingStatusRaw,
    };
  }

  if (billingStatusRaw === "trialing" || hasLiveTrial) {
    return {
      entitlementStatus: "trialing",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      billingStatusRaw,
    };
  }

  if (billingStatusRaw === "past_due" || billingStatusRaw === "unpaid") {
    return {
      entitlementStatus: "past_due",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      billingStatusRaw,
    };
  }

  if (billingStatusRaw === "canceled" || billingStatusRaw === "cancelled") {
    return {
      entitlementStatus: "canceled",
      entitlementSource,
      trialEnd,
      currentPeriodEnd,
      customerId,
      subscriptionId,
      billingStatusRaw,
    };
  }

  return {
    entitlementStatus: "inactive",
    entitlementSource,
    trialEnd,
    currentPeriodEnd,
    customerId,
    subscriptionId,
    billingStatusRaw,
  };
}
