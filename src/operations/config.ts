import type { OperationsEnvironment } from "./domain/types";

const VALID_ENVIRONMENTS = new Set<OperationsEnvironment>([
  "local",
  "preview",
  "staging",
  "production",
]);

export const getOperationsEnvironment = (): OperationsEnvironment => {
  const configured = process.env.OPERATIONS_ENVIRONMENT?.trim().toLowerCase();
  if (
    configured &&
    VALID_ENVIRONMENTS.has(configured as OperationsEnvironment)
  ) {
    return configured as OperationsEnvironment;
  }

  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  if (process.env.NODE_ENV === "development") return "local";

  return "unknown";
};
