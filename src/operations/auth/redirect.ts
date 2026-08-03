export const OPERATIONS_PATH = "/operations" as const;
export const OPERATIONS_ACTIVATION_PATH = "/operations-activate" as const;
export const OPERATIONS_LOGIN_PATH = "/login?next=%2Foperations" as const;

export type SafeAuthTarget =
  | typeof OPERATIONS_PATH
  | typeof OPERATIONS_ACTIVATION_PATH;

export const resolveSafeAuthTarget = (
  value: string | null | undefined,
): SafeAuthTarget | null => {
  if (value === OPERATIONS_PATH || value === OPERATIONS_ACTIVATION_PATH) {
    return value;
  }
  return null;
};

export const operationsAccessFailureMessage = (status: number): string => {
  if (status === 404) {
    return "Operations Center is currently disabled.";
  }
  if (status === 401) {
    return "Your session expired. Sign in again.";
  }
  if (status === 403) {
    return "This account is not authorized for Operations Center.";
  }
  return "Operations access could not be verified. Try again.";
};
