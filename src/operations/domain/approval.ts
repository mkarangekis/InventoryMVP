import { createHash } from "node:crypto";
import type { ApprovalRequest } from "./types";

const canonicalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeValue(entry)]),
    );
  }

  return value;
};

export const canonicalizeApprovalPayload = (payload: unknown): string =>
  JSON.stringify(canonicalizeValue(payload));

export const hashApprovalPayload = (payload: unknown): string =>
  createHash("sha256")
    .update(canonicalizeApprovalPayload(payload))
    .digest("hex");

export const isApprovalExpired = (
  approval: Pick<ApprovalRequest, "expiresAt">,
  now: Date,
): boolean => new Date(approval.expiresAt).getTime() <= now.getTime();
