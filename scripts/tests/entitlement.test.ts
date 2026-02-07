import { computeEntitlementFromBillingMetadata, isEntitledStatus } from "@/lib/billing/entitlement";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const now = new Date("2026-02-07T12:00:00.000Z");

// active
{
  const ent = computeEntitlementFromBillingMetadata(
    { stripe_status: "active" },
    now,
  );
  assert(ent.entitlementStatus === "active", "active should map to active");
  assert(isEntitledStatus(ent.entitlementStatus), "active should be entitled");
}

// trialing by status
{
  const ent = computeEntitlementFromBillingMetadata(
    { stripe_status: "trialing" },
    now,
  );
  assert(ent.entitlementStatus === "trialing", "trialing should map to trialing");
  assert(isEntitledStatus(ent.entitlementStatus), "trialing should be entitled");
}

// trialing by future trial_end even if stale status
{
  const ent = computeEntitlementFromBillingMetadata(
    { stripe_status: "incomplete", trial_ends_at: "2026-02-10T00:00:00.000Z" },
    now,
  );
  assert(ent.entitlementStatus === "trialing", "future trial should map to trialing");
}

// past_due
{
  const ent = computeEntitlementFromBillingMetadata(
    { stripe_status: "past_due" },
    now,
  );
  assert(ent.entitlementStatus === "past_due", "past_due should map to past_due");
  assert(!isEntitledStatus(ent.entitlementStatus), "past_due should not be entitled");
}

// unknown when no status
{
  const ent = computeEntitlementFromBillingMetadata({}, now);
  assert(ent.entitlementStatus === "unknown", "missing status should map to unknown");
}

console.log("entitlement.test.ts: ok");

