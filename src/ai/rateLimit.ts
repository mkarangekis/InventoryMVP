type RateWindow = {
  resetAt: number;
  count: number;
};

const windows = new Map<string, RateWindow>();

export const consumeRateLimit = (key: string, maxPerMinute: number) => {
  const now = Date.now();
  const window = windows.get(key);

  if (!window || now > window.resetAt) {
    windows.set(key, { resetAt: now + 60_000, count: 1 });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }

  if (window.count >= maxPerMinute) {
    return { allowed: false, remaining: 0, resetAt: window.resetAt };
  }

  window.count += 1;
  return { allowed: true, remaining: maxPerMinute - window.count };
};
