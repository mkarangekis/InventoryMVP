import { hashApprovalPayload, isApprovalExpired } from "./approval";
import type {
  ApprovalRequest,
  AutonomyTier,
  OperationsEnvironment,
  PolicyDecision,
} from "./types";

const FRESH_AUTH_WINDOW_MS = 10 * 60 * 1000;

type EvaluatePolicyInput = {
  tier: AutonomyTier;
  actionType: string;
  environment: OperationsEnvironment;
  payload: unknown;
  actorId: string;
  featureEnabled: boolean;
  executionEnabled: boolean;
  emergencyPaused: boolean;
  now: Date;
  authenticatedAt: Date | null;
  approval?: ApprovalRequest | null;
};

const denied = (
  code: Exclude<
    PolicyDecision["code"],
    "allowed_read" | "allowed_reversible_write"
  >,
  reason: string,
): PolicyDecision => ({ allowed: false, code, reason });

export const evaluateOperationsPolicy = (
  input: EvaluatePolicyInput,
): PolicyDecision => {
  if (!input.featureEnabled) {
    return denied(
      "feature_disabled",
      "The Operations Center feature is disabled.",
    );
  }

  if (input.tier === "D") {
    return denied(
      "tier_d_denied",
      "Tier D actions are prohibited and cannot be approved.",
    );
  }

  if (input.tier === "A") {
    return {
      allowed: true,
      code: "allowed_read",
      reason: "Read-only internal inspection is allowed.",
    };
  }

  if (!input.executionEnabled) {
    return denied(
      "execution_disabled",
      "Operations execution is disabled by feature policy.",
    );
  }

  if (input.emergencyPaused) {
    return denied(
      "emergency_paused",
      "Operations execution is paused for this workspace.",
    );
  }

  if (input.tier === "B") {
    return {
      allowed: true,
      code: "allowed_reversible_write",
      reason: "The reversible internal action is permitted by policy.",
    };
  }

  const approval = input.approval;
  if (!approval) {
    return denied(
      "approval_required",
      "An exact, unexpired approval is required.",
    );
  }

  if (
    approval.status !== "approved" ||
    approval.actionType !== input.actionType ||
    approval.environment !== input.environment
  ) {
    return denied(
      "approval_invalid",
      "The approval does not authorize this action and environment.",
    );
  }

  if (isApprovalExpired(approval, input.now)) {
    return denied("approval_expired", "The approval has expired.");
  }

  if (approval.payloadHash !== hashApprovalPayload(input.payload)) {
    return denied(
      "approval_payload_mismatch",
      "The action payload changed after approval.",
    );
  }

  if (approval.requestedBy === approval.approvedBy) {
    return denied(
      "separation_of_duties",
      "The requester cannot approve the same Tier C action.",
    );
  }

  if (
    !input.authenticatedAt ||
    input.authenticatedAt.getTime() > input.now.getTime() ||
    input.now.getTime() - input.authenticatedAt.getTime() > FRESH_AUTH_WINDOW_MS
  ) {
    return denied(
      "fresh_auth_required",
      "Fresh authentication within ten minutes is required.",
    );
  }

  return {
    allowed: true,
    code: "allowed_reversible_write",
    reason:
      "The exact Tier C action has a valid approval and fresh authentication.",
  };
};
