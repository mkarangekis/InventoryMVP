import {
  isOperationsAgentsEnabled,
  isOperationsApprovalsEnabled,
  isOperationsConnectorsEnabled,
  isOperationsEmergencyPaused,
  isOperationsExecutionEnabled,
  isOperationsOverviewEnabled,
} from "@/config/flags";
import { getOperationsEnvironment } from "@/operations/config";
import { createOpportunity } from "@/operations/domain/opportunities";
import type {
  AgentDefinition,
  ConnectorSummary,
  EvidenceReference,
} from "@/operations/domain/types";

const BASELINE_OBSERVED_AT = "2026-07-29T00:00:00-04:00";

const evidence: EvidenceReference[] = [
  {
    id: "ev-repository-inventory",
    sourceType: "repository",
    source: "docs/operations-center/01-repository-inventory.md",
    observedAt: BASELINE_OBSERVED_AT,
    freshness: "current",
    confidence: "high",
    synthetic: false,
  },
  {
    id: "ev-baseline",
    sourceType: "test",
    source: "docs/operations-center/12-baseline-verification-report.md",
    observedAt: BASELINE_OBSERVED_AT,
    freshness: "current",
    confidence: "high",
    synthetic: false,
  },
  {
    id: "ev-threat-model",
    sourceType: "repository",
    source: "docs/operations-center/09-security-and-privacy-threat-model.md",
    observedAt: BASELINE_OBSERVED_AT,
    freshness: "current",
    confidence: "high",
    synthetic: false,
  },
];

const opportunities = [
  createOpportunity({
    id: "opp-admin-boundary",
    title: "Establish explicit Operations authorization",
    category: "security",
    impact: 5,
    confidence: 5,
    effort: 2,
    risk: 2,
    evidenceIds: ["ev-repository-inventory", "ev-threat-model"],
  }),
  createOpportunity({
    id: "opp-cron-auth",
    title: "Make scheduled-job authentication fail closed",
    category: "reliability",
    impact: 5,
    confidence: 5,
    effort: 1,
    risk: 2,
    evidenceIds: ["ev-threat-model"],
  }),
  createOpportunity({
    id: "opp-baseline-quality",
    title: "Restore a reliable lint and formatting gate",
    category: "operations",
    impact: 4,
    confidence: 5,
    effort: 3,
    risk: 2,
    evidenceIds: ["ev-baseline"],
  }),
];

const agents: AgentDefinition[] = [
  {
    id: "repository-analyst",
    version: "1.0.0",
    name: "Repository analyst",
    purpose: "Summarize bounded repository evidence without modifying code.",
    mode: "disabled",
    autonomyTier: "A",
    modelProvider: "openai",
    inputSchemaVersion: "1",
    outputSchemaVersion: "1",
    maxRuntimeMs: 12_000,
    maxCostUsd: 0.05,
    canModifyOwnDefinition: false,
  },
  {
    id: "change-drafter",
    version: "1.0.0",
    name: "Change drafter",
    purpose: "Prepare an isolated patch for human review.",
    mode: "disabled",
    autonomyTier: "B",
    modelProvider: "openai",
    inputSchemaVersion: "1",
    outputSchemaVersion: "1",
    maxRuntimeMs: 30_000,
    maxCostUsd: 0.25,
    canModifyOwnDefinition: false,
  },
];

const connectors: ConnectorSummary[] = [
  {
    id: "local-repository",
    name: "Local repository",
    status: "local_read_only",
    access: "read_only",
    lastVerifiedAt: BASELINE_OBSERVED_AT,
    detail:
      "Evidence is limited to the current isolated branch and baseline runner.",
  },
  {
    id: "github",
    name: "GitHub",
    status: "unconfigured",
    access: "none",
    lastVerifiedAt: null,
    detail: "No repository app connection or writable scope was requested.",
  },
  {
    id: "openai",
    name: "OpenAI operations runtime",
    status: "disabled",
    access: "none",
    lastVerifiedAt: null,
    detail: "The provider boundary is disabled; no model call has been made.",
  },
  {
    id: "deployment",
    name: "Deployment platform",
    status: "unverified",
    access: "none",
    lastVerifiedAt: null,
    detail: "Production project, region, and deployment authority are unknown.",
  },
];

export const buildRepositoryEvidenceOverview = () => {
  const environment = getOperationsEnvironment();
  const executionEnabled = isOperationsExecutionEnabled();
  const emergencyPaused =
    isOperationsEmergencyPaused() ||
    !executionEnabled ||
    environment === "unknown";

  return {
    schemaVersion: "1",
    generatedAt: new Date().toISOString(),
    environment,
    sourceMode: "repository_evidence" as const,
    productionStatus: "not_deployed" as const,
    controls: {
      emergencyPaused,
      executionEnabled,
      externalWritesEnabled: false,
      approvalsConfigured: isOperationsApprovalsEnabled(),
    },
    featureModules: [
      {
        id: "overview",
        name: "System overview",
        enabled: isOperationsOverviewEnabled(),
      },
      {
        id: "approvals",
        name: "Approvals",
        enabled: isOperationsApprovalsEnabled(),
      },
      {
        id: "agents",
        name: "Agents",
        enabled: isOperationsAgentsEnabled(),
      },
      {
        id: "connectors",
        name: "Connectors",
        enabled: isOperationsConnectorsEnabled(),
      },
    ],
    baseline: {
      revision:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.OPERATIONS_REPOSITORY_REVISION ??
        null,
      observedAt: BASELINE_OBSERVED_AT,
      checks: [
        { name: "TypeScript", state: "passed", detail: "tsc --noEmit" },
        { name: "Production build", state: "passed", detail: "next build" },
        { name: "Entitlement unit test", state: "passed", detail: "1 test" },
        {
          name: "ESLint",
          state: "failed",
          detail: "94 pre-existing findings: 51 errors, 43 warnings",
        },
        {
          name: "Dependency audit",
          state: "failed",
          detail: "43 pre-existing advisories: 18 high, 20 moderate, 5 low",
        },
        {
          name: "Browser inspection",
          state: "blocked",
          detail:
            "No browser runtime was available in the isolated environment",
        },
      ],
    },
    evidence,
    opportunities,
    agents,
    connectors,
    approvals: {
      pending: 0,
      message:
        "No approval requests exist. External execution remains disabled by policy.",
    },
    audit: {
      entries: [],
      message:
        "No Operations actions have run. Runtime audit storage is not connected.",
    },
  };
};
