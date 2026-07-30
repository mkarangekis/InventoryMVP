import "server-only";

import {
  DisabledOperationsModelClient,
  MockOperationsModelClient,
  type OperationsModelClient,
} from "./model-client";
import { OpenAIOperationsModelClient } from "./openai-client";

const boundedInteger = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

export const createOperationsModelClient = (): OperationsModelClient => {
  const mode = process.env.OPERATIONS_AI_MODE?.trim().toLowerCase();

  if (mode === "mock") {
    return new MockOperationsModelClient();
  }

  if (mode !== "openai") {
    return new DisabledOperationsModelClient();
  }

  return new OpenAIOperationsModelClient(
    process.env.OPENAI_API_KEY ?? "",
    process.env.OPERATIONS_OPENAI_MODEL ?? "",
    boundedInteger(
      process.env.OPERATIONS_OPENAI_TIMEOUT_MS,
      12_000,
      1_000,
      60_000,
    ),
    boundedInteger(process.env.OPERATIONS_OPENAI_MAX_RETRIES, 2, 0, 3),
  );
};
