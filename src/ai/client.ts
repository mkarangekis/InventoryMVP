import crypto from "node:crypto";
import { buildCacheKey, getCache, setCache } from "@/ai/cache";
import { isCircuitOpen, recordFailure, recordSuccess } from "@/ai/circuitBreaker";
import { logAiRequest } from "@/ai/logger";
import { consumeRateLimit } from "@/ai/rateLimit";
import { PROMPT_VERSION } from "@/ai/prompts";

type OpenAiRequest = {
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

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const getEnvNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const requestOpenAi = async (payload: OpenAiRequest) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const timeoutMs = payload.timeoutMs ?? getEnvNumber("OPENAI_TIMEOUT_MS", 12000);
  const maxRetries = payload.maxRetries ?? getEnvNumber("OPENAI_MAX_RETRIES", 2);
  const rateLimit = getEnvNumber("OPENAI_RATE_LIMIT_PER_MIN", 60);
  const breakerThreshold = getEnvNumber("OPENAI_CIRCUIT_THRESHOLD", 5);
  const breakerCooldown = getEnvNumber("OPENAI_CIRCUIT_COOLDOWN_MS", 120000);

  if (isCircuitOpen(payload.feature)) {
    throw new Error("AI circuit breaker open");
  }

  const rate = consumeRateLimit(payload.feature, rateLimit);
  if (!rate.allowed) {
    throw new Error("AI rate limit exceeded");
  }

  const cacheKey = buildCacheKey(payload.cacheKeyParts);
  const cached = getCache<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const body = {
    model: payload.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: payload.system },
      { role: "user", content: payload.user },
    ],
  };

  let lastError: Error | null = null;
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI returned empty content");
      }

      setCache(cacheKey, content, payload.cacheTtlMs);
      recordSuccess(payload.feature);
      await logAiRequest({
        tenantId: payload.tenantId,
        locationId: payload.locationId,
        userId: payload.userId,
        feature: payload.feature,
        promptVersion: PROMPT_VERSION,
        inputHash: payload.inputHash,
        model: payload.model,
        success: true,
        durationMs: Date.now() - startedAt,
      });
      return content;
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 300 * Math.pow(2, attempt)),
        );
      }
    }
  }

  recordFailure(payload.feature, breakerThreshold, breakerCooldown);
  await logAiRequest({
    tenantId: payload.tenantId,
    locationId: payload.locationId,
    userId: payload.userId,
    feature: payload.feature,
    promptVersion: PROMPT_VERSION,
    inputHash: payload.inputHash,
    model: payload.model,
    success: false,
    error: lastError?.message ?? "Unknown error",
    durationMs: Date.now() - startedAt,
  });

  throw lastError ?? new Error("OpenAI request failed");
};

export const requestAiJson = async (payload: OpenAiRequest) => {
  const raw = await requestOpenAi(payload);
  return JSON.parse(raw) as unknown;
};
