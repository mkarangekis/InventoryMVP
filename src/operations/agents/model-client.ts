import type { AgentDefinition, EvidenceReference } from "../domain/types";

export type OperationsModelRequest = {
  agent: AgentDefinition;
  instructions: string;
  evidence: EvidenceReference[];
  task: string;
  outputSchemaName: string;
  outputSchema: Record<string, unknown>;
  maxOutputTokens: number;
};

export type OperationsModelResult = {
  responseId: string;
  model: string;
  output: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: null;
  durationMs: number;
  provider: "openai" | "mock";
};

export interface OperationsModelClient {
  readonly mode: "disabled" | "mock" | "openai";
  generate(request: OperationsModelRequest): Promise<OperationsModelResult>;
}

export class OperationsModelDisabledError extends Error {
  readonly code = "operations_model_disabled";

  constructor() {
    super("The Operations model provider is disabled.");
  }
}

export class DisabledOperationsModelClient implements OperationsModelClient {
  readonly mode = "disabled" as const;

  async generate(request: OperationsModelRequest): Promise<never> {
    void request;
    throw new OperationsModelDisabledError();
  }
}

export class MockOperationsModelClient implements OperationsModelClient {
  readonly mode = "mock" as const;

  async generate(
    request: OperationsModelRequest,
  ): Promise<OperationsModelResult> {
    return {
      responseId: `mock-${request.agent.id}-${request.agent.version}`,
      model: "deterministic-mock",
      output: {
        summary: "Synthetic result from the deterministic Operations mock.",
        findings: [],
        evidenceIds: request.evidence.map((item) => item.id),
        synthetic: true,
      },
      inputTokens: 0,
      outputTokens: 0,
      costUsd: null,
      durationMs: 0,
      provider: "mock",
    };
  }
}
