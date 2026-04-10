import { createHmac } from "crypto";

/**
 * Verifies the QuickBooks webhook signature.
 * QB signs the raw body with HMAC-SHA256 using the verifier token,
 * then base64-encodes the result and sends it in the `intuit-signature` header.
 */
export function verifyQuickBooksSignature(
  rawBody: string,
  signature: string,
  verifierToken: string,
): boolean {
  const expected = createHmac("sha256", verifierToken)
    .update(rawBody)
    .digest("base64");
  return expected === signature;
}

/**
 * Maps a QuickBooks entity name + operation to a billing status string.
 * Returns null if the event doesn't affect subscription status.
 */
export function qbEventToStatus(
  entityName: string,
  operation: string,
): "active" | "trialing" | "past_due" | "canceled" | null {
  const name = entityName.toLowerCase();
  const op = operation.toLowerCase();

  // Payment received → subscription active
  if (name === "payment" && op === "create") return "active";

  // Invoice sent for first time → treat as trialing until paid
  if (name === "invoice" && op === "create") return "trialing";

  // Invoice voided or deleted → subscription canceled
  if (name === "invoice" && (op === "delete" || op === "void")) return "canceled";

  // Charge failure or credit memo → past due
  if (name === "creditmemo" && op === "create") return "past_due";

  return null;
}
