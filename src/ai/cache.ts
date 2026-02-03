type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export const getCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
};

export const setCache = <T>(key: string, value: T, ttlMs: number) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const buildCacheKey = (parts: Array<string | number | null | undefined>) =>
  parts
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(":");
