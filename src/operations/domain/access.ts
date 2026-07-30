import type { OperationsRole } from "./types";

export type OperationsAccessInput = {
  featureEnabled: boolean;
  userId: string | null;
  tenantId: string | null;
  profileRole: string | null;
  operationsRole: string | null;
  isDemo: boolean;
};

export type OperationsAccessDecision =
  | {
      allowed: true;
      role: OperationsRole;
    }
  | {
      allowed: false;
      code:
        | "feature_disabled"
        | "unauthenticated"
        | "tenant_required"
        | "demo_denied"
        | "permission_denied";
    };

export const resolveOperationsAccess = (
  input: OperationsAccessInput,
): OperationsAccessDecision => {
  if (!input.featureEnabled) {
    return { allowed: false, code: "feature_disabled" };
  }

  if (!input.userId) {
    return { allowed: false, code: "unauthenticated" };
  }

  if (input.isDemo) {
    return { allowed: false, code: "demo_denied" };
  }

  if (!input.tenantId) {
    return { allowed: false, code: "tenant_required" };
  }

  // Existing tenant ownership is necessary but not sufficient. The explicit
  // Operations grant lives in server-controlled Auth app_metadata so enabling
  // the feature cannot grant every customer owner platform access.
  if (input.profileRole !== "owner" || input.operationsRole !== "owner") {
    return { allowed: false, code: "permission_denied" };
  }

  return { allowed: true, role: "owner" };
};
