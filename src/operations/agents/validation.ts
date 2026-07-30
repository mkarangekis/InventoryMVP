export type RepositoryAnalysisOutput = {
  summary: string;
  findings: Array<{
    title: string;
    detail: string;
    evidenceIds: string[];
  }>;
  evidenceIds: string[];
  synthetic: boolean;
};

export const repositoryAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings", "evidenceIds", "synthetic"],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 2000 },
    findings: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "evidenceIds"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          detail: { type: "string", minLength: 1, maxLength: 2000 },
          evidenceIds: {
            type: "array",
            maxItems: 20,
            items: { type: "string" },
          },
        },
      },
    },
    evidenceIds: {
      type: "array",
      maxItems: 50,
      items: { type: "string" },
    },
    synthetic: { type: "boolean" },
  },
} satisfies Record<string, unknown>;

const isStringArray = (value: unknown, maximum: number): value is string[] =>
  Array.isArray(value) &&
  value.length <= maximum &&
  value.every((item) => typeof item === "string");

export const validateRepositoryAnalysisOutput = (
  value: unknown,
  allowedEvidenceIds: Set<string>,
): value is RepositoryAnalysisOutput => {
  if (!value || typeof value !== "object") return false;

  const output = value as Record<string, unknown>;
  if (
    typeof output.summary !== "string" ||
    output.summary.length === 0 ||
    output.summary.length > 2000 ||
    typeof output.synthetic !== "boolean" ||
    !isStringArray(output.evidenceIds, 50) ||
    !Array.isArray(output.findings) ||
    output.findings.length > 20
  ) {
    return false;
  }

  if (!output.evidenceIds.every((id) => allowedEvidenceIds.has(id))) {
    return false;
  }

  return output.findings.every((finding) => {
    if (!finding || typeof finding !== "object") return false;
    const item = finding as Record<string, unknown>;
    return (
      typeof item.title === "string" &&
      item.title.length > 0 &&
      item.title.length <= 200 &&
      typeof item.detail === "string" &&
      item.detail.length > 0 &&
      item.detail.length <= 2000 &&
      isStringArray(item.evidenceIds, 20) &&
      item.evidenceIds.every((id) => allowedEvidenceIds.has(id))
    );
  });
};
