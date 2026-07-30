import assert from "node:assert/strict";
import {
  isOperationsCenterEnabled,
  isOperationsEmergencyPaused,
  isOperationsExecutionEnabled,
} from "../../src/config/flags";
import {
  DisabledOperationsModelClient,
  MockOperationsModelClient,
} from "../../src/operations/agents/model-client";
import { validateRepositoryAnalysisOutput } from "../../src/operations/agents/validation";
import { resolveOperationsAccess } from "../../src/operations/domain/access";
import { hashApprovalPayload } from "../../src/operations/domain/approval";
import { createOpportunity } from "../../src/operations/domain/opportunities";
import { evaluateOperationsPolicy } from "../../src/operations/domain/policy";
import type { ApprovalRequest } from "../../src/operations/domain/types";
import { redactOperationsArtifact } from "../../src/operations/security/redaction";

const originalEnvironment = {
  OPERATIONS_CENTER: process.env.OPERATIONS_CENTER,
  OPERATIONS_EXECUTION: process.env.OPERATIONS_EXECUTION,
  OPERATIONS_EMERGENCY_PAUSE: process.env.OPERATIONS_EMERGENCY_PAUSE,
};

const now = new Date("2026-07-29T16:00:00.000Z");
const payload = {
  environment: "staging",
  action: "save_preview",
  artifact: { branch: "codex/example", files: ["a.ts", "b.ts"] },
};

const approval = (
  overrides: Partial<ApprovalRequest> = {},
): ApprovalRequest => ({
  id: "approval-1",
  tenantId: "tenant-a",
  actionType: "save_preview",
  environment: "staging",
  autonomyTier: "C",
  payloadHash: hashApprovalPayload(payload),
  requestedBy: "requester",
  approvedBy: "owner",
  status: "approved",
  expiresAt: "2026-07-29T16:15:00.000Z",
  createdAt: "2026-07-29T15:45:00.000Z",
  approvedAt: "2026-07-29T15:50:00.000Z",
  consumedAt: null,
  ...overrides,
});

const run = async () => {
  try {
    delete process.env.OPERATIONS_CENTER;
    delete process.env.OPERATIONS_EXECUTION;
    delete process.env.OPERATIONS_EMERGENCY_PAUSE;

    assert.equal(isOperationsCenterEnabled(), false);
    assert.equal(isOperationsExecutionEnabled(), false);
    assert.equal(isOperationsEmergencyPaused(), true);

    assert.deepEqual(
      resolveOperationsAccess({
        featureEnabled: true,
        userId: "owner-user",
        tenantId: "tenant-a",
        profileRole: "owner",
        operationsRole: "owner",
        isDemo: false,
      }),
      { allowed: true, role: "owner" },
    );

    for (const role of ["manager", "analyst", "admin", "super_admin", null]) {
      assert.equal(
        resolveOperationsAccess({
          featureEnabled: true,
          userId: "user",
          tenantId: "tenant-a",
          profileRole: role,
          operationsRole: "owner",
          isDemo: false,
        }).allowed,
        false,
      );
    }

    assert.equal(
      resolveOperationsAccess({
        featureEnabled: true,
        userId: "tenant-owner-without-operations-grant",
        tenantId: "tenant-a",
        profileRole: "owner",
        operationsRole: null,
        isDemo: false,
      }).allowed,
      false,
    );

    assert.equal(
      resolveOperationsAccess({
        featureEnabled: true,
        userId: "tenant-owner-with-unknown-operations-grant",
        tenantId: "tenant-a",
        profileRole: "owner",
        operationsRole: "admin",
        isDemo: false,
      }).allowed,
      false,
    );

    assert.equal(
      resolveOperationsAccess({
        featureEnabled: true,
        userId: "demo-user",
        tenantId: "demo-tenant",
        profileRole: "owner",
        operationsRole: "owner",
        isDemo: true,
      }).allowed,
      false,
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "A",
        actionType: "inspect",
        environment: "staging",
        payload: {},
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: false,
        emergencyPaused: true,
        now,
        authenticatedAt: null,
      }).allowed,
      true,
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "B",
        actionType: "save_draft",
        environment: "staging",
        payload: {},
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: true,
        now,
        authenticatedAt: now,
      }).code,
      "emergency_paused",
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "D",
        actionType: "change_price",
        environment: "production",
        payload: {},
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: false,
        now,
        authenticatedAt: now,
      }).code,
      "tier_d_denied",
    );

    const approvedDecision = evaluateOperationsPolicy({
      tier: "C",
      actionType: "save_preview",
      environment: "staging",
      payload,
      actorId: "owner",
      featureEnabled: true,
      executionEnabled: true,
      emergencyPaused: false,
      now,
      authenticatedAt: new Date("2026-07-29T15:55:00.000Z"),
      approval: approval(),
    });
    assert.equal(approvedDecision.allowed, true);

    assert.equal(
      evaluateOperationsPolicy({
        tier: "C",
        actionType: "save_preview",
        environment: "staging",
        payload: { ...payload, artifact: { branch: "mutated" } },
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: false,
        now,
        authenticatedAt: now,
        approval: approval(),
      }).code,
      "approval_payload_mismatch",
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "C",
        actionType: "save_preview",
        environment: "staging",
        payload,
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: false,
        now,
        authenticatedAt: now,
        approval: approval({ expiresAt: "2026-07-29T15:59:59.000Z" }),
      }).code,
      "approval_expired",
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "C",
        actionType: "save_preview",
        environment: "staging",
        payload,
        actorId: "requester",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: false,
        now,
        authenticatedAt: now,
        approval: approval({ approvedBy: "requester" }),
      }).code,
      "separation_of_duties",
    );

    assert.equal(
      evaluateOperationsPolicy({
        tier: "C",
        actionType: "save_preview",
        environment: "staging",
        payload,
        actorId: "owner",
        featureEnabled: true,
        executionEnabled: true,
        emergencyPaused: false,
        now,
        authenticatedAt: new Date("2026-07-29T15:49:59.000Z"),
        approval: approval(),
      }).code,
      "fresh_auth_required",
    );

    assert.equal(
      hashApprovalPayload({ b: 2, a: 1 }),
      hashApprovalPayload({ a: 1, b: 2 }),
    );

    const opportunity = createOpportunity({
      id: "bounded",
      title: "Bounds",
      category: "operations",
      impact: 100,
      confidence: 0,
      effort: 0,
      risk: 100,
      evidenceIds: ["evidence"],
    });
    assert.deepEqual(
      {
        impact: opportunity.impact,
        confidence: opportunity.confidence,
        effort: opportunity.effort,
        risk: opportunity.risk,
      },
      { impact: 5, confidence: 1, effort: 1, risk: 5 },
    );
    assert.equal(opportunity.scoringVersion, "ice-risk-v1");

    assert.deepEqual(
      redactOperationsArtifact({
        authorization: "Bearer secret",
        nested: { apiKey: "secret", safe: "value" },
        tokenCount: 12,
      }),
      {
        authorization: "[REDACTED]",
        nested: { apiKey: "[REDACTED]", safe: "value" },
        tokenCount: "[REDACTED]",
      },
    );

    const mockClient = new MockOperationsModelClient();
    const mockResult = await mockClient.generate({
      agent: {
        id: "repository-analyst",
        version: "1.0.0",
        name: "Repository analyst",
        purpose: "Test",
        mode: "mock",
        autonomyTier: "A",
        modelProvider: "openai",
        inputSchemaVersion: "1",
        outputSchemaVersion: "1",
        maxRuntimeMs: 12_000,
        maxCostUsd: 0.05,
        canModifyOwnDefinition: false,
      },
      instructions: "Use evidence only.",
      evidence: [
        {
          id: "evidence-1",
          sourceType: "test",
          source: "test fixture",
          observedAt: now.toISOString(),
          freshness: "current",
          confidence: "high",
          synthetic: true,
        },
      ],
      task: "Return a bounded test result.",
      outputSchemaName: "repository_analysis",
      outputSchema: {},
      maxOutputTokens: 200,
    });
    assert.equal(mockResult.provider, "mock");
    assert.equal(
      validateRepositoryAnalysisOutput(
        mockResult.output,
        new Set(["evidence-1"]),
      ),
      true,
    );

    assert.equal(
      validateRepositoryAnalysisOutput(
        {
          summary: "Unsupported claim",
          findings: [],
          evidenceIds: ["not-in-input"],
          synthetic: false,
        },
        new Set(["evidence-1"]),
      ),
      false,
    );

    await assert.rejects(
      new DisabledOperationsModelClient().generate({
        agent: {
          id: "disabled",
          version: "1",
          name: "Disabled",
          purpose: "Test",
          mode: "disabled",
          autonomyTier: "A",
          modelProvider: "none",
          inputSchemaVersion: "1",
          outputSchemaVersion: "1",
          maxRuntimeMs: 100,
          maxCostUsd: 0,
          canModifyOwnDefinition: false,
        },
        instructions: "",
        evidence: [],
        task: "",
        outputSchemaName: "disabled",
        outputSchema: {},
        maxOutputTokens: 1,
      }),
      { code: "operations_model_disabled" },
    );

    console.log("operations-center tests: ok");
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
