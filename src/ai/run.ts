import { requestAiJson, sha256 } from "@/ai/client";
import { PROMPT_VERSION } from "@/ai/prompts";

type RunAiArgs<T> = {
  feature: string;
  system: string;
  user: string;
  model: string;
  cacheKeyParts: Array<string | number | null | undefined>;
  cacheTtlMs: number;
  inputHash: string;
  tenantId?: string | null;
  locationId?: string | null;
  userId?: string | null;
  validate: (value: unknown) => T | null;
  fallback: () => T;
};

export const runAiFeature = async <T>(args: RunAiArgs<T>) => {
  try {
    const raw = await requestAiJson({
      feature: args.feature,
      model: args.model,
      system: args.system,
      user: args.user,
      cacheKeyParts: args.cacheKeyParts,
      cacheTtlMs: args.cacheTtlMs,
      inputHash: args.inputHash,
      tenantId: args.tenantId,
      locationId: args.locationId,
      userId: args.userId,
    });
    const parsed = args.validate(raw);
    if (!parsed) {
      return args.fallback();
    }
    return parsed;
  } catch (error) {
    console.error(`${args.feature} ai failed`, error);
    return args.fallback();
  }
};

export const hashInput = (value: unknown) =>
  sha256(JSON.stringify(value, null, 0));

export { PROMPT_VERSION };
