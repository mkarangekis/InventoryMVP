/**
 * AI response cache.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * falls back to an in-process Map (single-instance only, no persistence).
 */

// ── In-memory fallback ────────────────────────────────────────────────────────

type CacheEntry<T> = { value: T; expiresAt: number };
const memCache = new Map<string, CacheEntry<unknown>>();

const memGet = <T>(key: string): T | null => {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.value as T;
};

const memSet = <T>(key: string, value: T, ttlMs: number) => {
  memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

// ── Upstash Redis client (lazy singleton) ─────────────────────────────────────

let _redis: import("@upstash/redis").Redis | null = null;

const getRedis = (): import("@upstash/redis").Redis | null => {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    // Dynamic require so this file compiles even without the package
    // (it's already installed via pnpm add @upstash/redis)
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export const getCache = async <T>(key: string): Promise<T | null> => {
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get<T>(key);
      return val ?? null;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  return memGet<T>(key);
};

export const setCache = async <T>(key: string, value: T, ttlMs: number): Promise<void> => {
  const redis = getRedis();
  if (redis) {
    try {
      const ttlSec = Math.max(1, Math.round(ttlMs / 1000));
      await redis.set(key, value, { ex: ttlSec });
      return;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  memSet(key, value, ttlMs);
};

export const buildCacheKey = (parts: Array<string | number | null | undefined>) =>
  parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .join(":");
