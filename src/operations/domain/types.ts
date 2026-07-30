export type OperationsEnvironment =
  | "local"
  | "preview"
  | "staging"
  | "production"
  | "unknown";

export type OperationsRole = "owner";

export type AutonomyTier = "A" | "B" | "C" | "D";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "consumed";

export type OperationsPrincipal = {
  userId: string;
  tenantId: string;
  role: OperationsRole;
  email: string | null;
  authenticatedAt: string | null;
};

export type ApprovalRequest = {
  id: string;
  tenantId: string;
  actionType: string;
  environment: OperationsEnvironment;
  autonomyTier: "C";
  payloadHash: string;
  requestedBy: string;
  approvedBy: string | null;
  status: ApprovalStatus;
  expiresAt: string;
  createdAt: string;
  approvedAt: string | null;
  consumedAt: string | null;
};

export type PolicyDecision = {
  allowed: boolean;
  code:
    | "allowed_read"
    | "allowed_reversible_write"
    | "feature_disabled"
    | "execution_disabled"
    | "emergency_paused"
    | "approval_required"
    | "approval_invalid"
    | "approval_expired"
    | "approval_payload_mismatch"
    | "fresh_auth_required"
    | "separation_of_duties"
    | "tier_d_denied";
  reason: string;
};

export type EvidenceReference = {
  id: string;
  sourceType: "repository" | "test" | "configuration" | "integration";
  source: string;
  observedAt: string;
  freshness: "current" | "stale" | "unknown";
  confidence: "high" | "medium" | "low";
  synthetic: boolean;
};

export type Opportunity = {
  id: string;
  title: string;
  category: "reliability" | "security" | "product" | "growth" | "operations";
  impact: number;
  confidence: number;
  effort: number;
  risk: number;
  score: number;
  scoringVersion: string;
  evidenceIds: string[];
};

export type AgentDefinition = {
  id: string;
  version: string;
  name: string;
  purpose: string;
  mode: "disabled" | "mock" | "read_only";
  autonomyTier: AutonomyTier;
  modelProvider: "openai" | "none";
  inputSchemaVersion: string;
  outputSchemaVersion: string;
  maxRuntimeMs: number;
  maxCostUsd: number;
  canModifyOwnDefinition: false;
};

export type ConnectorStatus =
  | "disabled"
  | "mock"
  | "unconfigured"
  | "unverified"
  | "local_read_only";

export type ConnectorSummary = {
  id: string;
  name: string;
  status: ConnectorStatus;
  access: "none" | "read_only";
  lastVerifiedAt: string | null;
  detail: string;
};
