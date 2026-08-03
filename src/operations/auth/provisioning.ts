import { hashApprovalPayload } from "@/operations/domain/approval";

export type OperationsOwnerProvisionPlan = {
  action: "invite_operations_owner";
  environment: "staging" | "production";
  email: string;
  tenantId: string;
  redirectUrl: string;
  profileRole: "owner";
  operationsRole: "owner";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createOperationsOwnerProvisionPlan = ({
  email,
  tenantId,
  environment,
  siteUrl,
}: {
  email: string;
  tenantId: string;
  environment: "staging" | "production";
  siteUrl: string;
}): OperationsOwnerProvisionPlan => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@") || normalizedEmail.length > 254) {
    throw new Error("A valid administrator email is required.");
  }
  if (!UUID_PATTERN.test(tenantId)) {
    throw new Error("A valid tenant UUID is required.");
  }

  const parsedSiteUrl = new URL(siteUrl);
  if (environment === "production" && parsedSiteUrl.protocol !== "https:") {
    throw new Error("Production invitation URLs must use HTTPS.");
  }

  const redirectUrl = new URL("/auth/callback", parsedSiteUrl);
  redirectUrl.searchParams.set("next", "/operations-activate");

  return {
    action: "invite_operations_owner",
    environment,
    email: normalizedEmail,
    tenantId: tenantId.toLowerCase(),
    redirectUrl: redirectUrl.toString(),
    profileRole: "owner",
    operationsRole: "owner",
  };
};

export const hashOperationsOwnerProvisionPlan = (
  plan: OperationsOwnerProvisionPlan,
): string => hashApprovalPayload(plan);
