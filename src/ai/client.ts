import crypto from "node:crypto";
import { buildCacheKey, getCache, setCache } from "@/ai/cache";
import { isCircuitOpen, recordFailure, recordSuccess } from "@/ai/circuitBreaker";
import { logAiRequest } from "@/ai/logger";
import { consumeRateLimit } from "@/ai/rateLimit";
import { PROMPT_VERSION } from "@/ai/prompts";

export type AiRequest = {
  feature: string;
  model: string;
  system: string;
  user: string;
  inputHash: string;
  cacheKeyParts: Array<string | number | null | undefined>;
  cacheTtlMs: number;
  maxRetries?: number;
  timeoutMs?: number;
  tenantId?: string | null;
  locationId?: string | null;
  userId?: string | null;
};

const DEFAULT_MODEL = "claude-sonnet-4-6";

const getEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const requestAnthropic = async (payload: AiRequest): Promise<string> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const timeoutMs     = payload.timeoutMs ?? getEnvNumber("AI_TIMEOUT_MS", 20000);
  const maxRetries    = payload.maxRetries ?? getEnvNumber("AI_MAX_RETRIES", 2);
  const rateLimit     = getEnvNumber("AI_RATE_LIMIT_PER_MIN", 60);
  const breakerThres  = getEnvNumber("AI_CIRCUIT_THRESHOLD", 5);
  const breakerCool   = getEnvNumber("AI_CIRCUIT_COOLDOWN_MS", 120000);
  const model         = payload.model || DEFAULT_MODEL;

  if (isCircuitOpen(payload.feature)) throw new Error("AI circuit breaker open");

  const rate = consumeRateLimit(payload.feature, rateLimit);
  if (!rate.allowed) throw new Error("AI rate limit exceeded");

  const cacheKey = buildCacheKey(payload.cacheKeyParts);
  const cached = await getCache<string>(cacheKey);
  if (cached) return cached;

  // Lazy-import Anthropic SDK (already installed)
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });

  let lastError: Error | null = null;
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0.2,
        system: payload.system + "\n\nReturn ONLY valid JSON. No markdown, no code fences.",
        messages: [{ role: "user", content: payload.user }],
      });

      const block = message.content.find((b) => b.type === "text");
      const content = block?.type === "text" ? block.text.trim() : null;
      if (!content) throw new Error("Anthropic returned empty content");

      // Strip any accidental markdown fences
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      await setCache(cacheKey, cleaned, payload.cacheTtlMs);
      recordSuccess(payload.feature);
      await logAiRequest({
        tenantId: payload.tenantId,
        locationId: payload.locationId,
        userId: payload.userId,
        feature: payload.feature,
        promptVersion: PROMPT_VERSION,
        inputHash: payload.inputHash,
        model,
        success: true,
        durationMs: Date.now() - startedAt,
      });
      return cleaned;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
      }
    }
  }

  recordFailure(payload.feature, breakerThres, breakerCool);
  await logAiRequest({
    tenantId: payload.tenantId,
    locationId: payload.locationId,
    userId: payload.userId,
    feature: payload.feature,
    promptVersion: PROMPT_VERSION,
    inputHash: payload.inputHash,
    model,
    success: false,
    error: lastError?.message ?? "Unknown error",
    durationMs: Date.now() - startedAt,
  });

  throw lastError ?? new Error("Anthropic request failed");
};

export const requestAiJson = async (payload: AiRequest) => {
  const raw = await requestAnthropic(payload);
  return JSON.parse(raw) as unknown;
};
