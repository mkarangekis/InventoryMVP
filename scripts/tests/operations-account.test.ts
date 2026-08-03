import assert from "node:assert/strict";
import {
  operationsAccessFailureMessage,
  resolveSafeAuthTarget,
} from "../../src/operations/auth/redirect";
import {
  createOperationsOwnerProvisionPlan,
  hashOperationsOwnerProvisionPlan,
} from "../../src/operations/auth/provisioning";

const tenantId = "11111111-1111-4111-8111-111111111111";
const plan = createOperationsOwnerProvisionPlan({
  email: " Owner+Ops@Example.com ",
  tenantId,
  environment: "production",
  siteUrl: "https://www.pourdex.com",
});

assert.equal(plan.email, "owner+ops@example.com");
assert.equal(plan.tenantId, tenantId);
assert.equal(
  plan.redirectUrl,
  "https://www.pourdex.com/auth/callback?next=%2Foperations-activate",
);
assert.equal(plan.profileRole, "owner");
assert.equal(plan.operationsRole, "owner");
assert.equal(
  hashOperationsOwnerProvisionPlan(plan),
  hashOperationsOwnerProvisionPlan({ ...plan }),
);

assert.equal(resolveSafeAuthTarget("/operations"), "/operations");
assert.equal(
  resolveSafeAuthTarget("/operations-activate"),
  "/operations-activate",
);
for (const unsafeTarget of [
  "https://attacker.example",
  "//attacker.example",
  "/dashboard",
  "/operations?role=owner",
  null,
]) {
  assert.equal(resolveSafeAuthTarget(unsafeTarget), null);
}

assert.equal(
  operationsAccessFailureMessage(403),
  "This account is not authorized for Operations Center.",
);
assert.match(operationsAccessFailureMessage(404), /disabled/);

assert.throws(
  () =>
    createOperationsOwnerProvisionPlan({
      email: "owner@example.com",
      tenantId,
      environment: "production",
      siteUrl: "http://www.pourdex.com",
    }),
  /HTTPS/,
);

console.log("operations account tests: ok");
