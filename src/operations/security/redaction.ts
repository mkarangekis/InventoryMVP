const SECRET_KEY_PATTERN =
  /(authorization|api[_-]?key|secret|password|token|credential|cookie)/i;

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactValue(entry),
      ]),
    );
  }

  return value;
};

export const redactOperationsArtifact = <T>(value: T): T =>
  redactValue(value) as T;
