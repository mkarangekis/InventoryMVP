import { timingSafeEqual } from "node:crypto";

export const isCronRequestAuthorized = (
  authorizationHeader: string | null,
  cronSecret: string | undefined,
): boolean => {
  if (!authorizationHeader || !cronSecret) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authorizationHeader);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
};
