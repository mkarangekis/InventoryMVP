import type { Opportunity } from "./types";

export const OPPORTUNITY_SCORING_VERSION = "ice-risk-v1";

const clamp = (value: number): number => Math.min(5, Math.max(1, value));

export const scoreOpportunity = ({
  impact,
  confidence,
  effort,
  risk,
}: Pick<Opportunity, "impact" | "confidence" | "effort" | "risk">): number => {
  const boundedImpact = clamp(impact);
  const boundedConfidence = clamp(confidence);
  const boundedEffort = clamp(effort);
  const boundedRisk = clamp(risk);

  return Number(
    (
      (boundedImpact * boundedConfidence) /
      (boundedEffort + boundedRisk)
    ).toFixed(2),
  );
};

export const createOpportunity = (
  input: Omit<Opportunity, "score" | "scoringVersion">,
): Opportunity => ({
  ...input,
  impact: clamp(input.impact),
  confidence: clamp(input.confidence),
  effort: clamp(input.effort),
  risk: clamp(input.risk),
  score: scoreOpportunity(input),
  scoringVersion: OPPORTUNITY_SCORING_VERSION,
});
