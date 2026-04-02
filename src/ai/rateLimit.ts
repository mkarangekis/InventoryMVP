/**
 * AI rate limiting — Redis sliding window.
 * Falls back to in-process Map when Redis is unavailable (dev / cold start).
 */

// ── In-memory fallback ─────────────────────────────────────────────────────
type RateWindow = { resetAt: number; count: number };
const _mem = new Map<string, RateWindow>();

const memConsume = (key: string, maxPerMinute: number) => {
  const now = Date.now();
  const win = _mem.get(key);
  if (!win || now > win.resetAt) {
    _mem.set(key, { resetAt: now + 60_000, count: 1 });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (win.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  win.count += 1;
  return { allowed: true, remaining: maxPerMinute - win.count };
};

// ── Redis sliding window ───────────────────────────────────────────────────
const getRedis = (): import("@upstash/redis").Redis | null => {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    return new Redis({ url, token });
  } catch { return null; }
};

// ── Public API (async) ─────────────────────────────────────────────────────
export const consumeRateLimit = async (
  key: string,
  maxPerMinute: number,
): Promise<{ allowed: boolean; remaining: number }> => {
  const redis = getRedis();
  if (!redis) return memConsume(key, maxPerMinute);

  try {
    const now     = Date.now();
    const window  = Math.floor(now / 60_000); // 1-min buckets
    const rkey    = `rl:${key}:${window}`;
    const count   = await redis.incr(rkey);
    if (count === 1) await redis.expire(rkey, 90); // expire after 90s
    const allowed   = count <= maxPerMinute;
    const remaining = Math.max(0, maxPerMinute - count);
    return { allowed, remaining };
  } catch {
    return memConsume(key, maxPerMinute);
  }
};
