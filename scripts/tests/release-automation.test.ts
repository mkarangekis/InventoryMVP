import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const workflow = readFileSync(
  resolve(
    repositoryRoot,
    ".github",
    "workflows",
    "operations-database-release.yml",
  ),
  "utf8",
);
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "supabase",
    "migrations",
    "20260729000000_operations_center.sql",
  ),
  "utf8",
);
const reconciliationWorkflow = readFileSync(
  resolve(
    repositoryRoot,
    ".github",
    "workflows",
    "operations-database-reconciliation.yml",
  ),
  "utf8",
);
const reconciliationManifest = JSON.parse(
  readFileSync(
    resolve(
      repositoryRoot,
      "scripts",
      "operations",
      "production-migration-reconciliation.json",
    ),
    "utf8",
  ),
) as {
  schema_version: number;
  repair_existing: Array<ReconciliationEntry>;
  apply_before_operations: Array<ReconciliationEntry>;
  deferred_operations_migration: ReconciliationEntry;
};
const verifier = readFileSync(
  resolve(
    repositoryRoot,
    "scripts",
    "operations",
    "verify-operations-schema.sql",
  ),
  "utf8",
);

assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /^\s{2}push:/m);
assert.match(workflow, /permissions:\s*\n\s+contents: read/);
assert.match(workflow, /name: operations-production/);
assert.match(workflow, /APPROVED_RELEASE_SHA/);
assert.match(workflow, /APPROVED_MIGRATION_SHA256/);
assert.match(workflow, /APPROVED_BACKUP_REFERENCE/);
assert.match(workflow, /APPROVED_CHANGE_RECORD/);
assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
assert.match(workflow, /persist-credentials: false/g);

assert.doesNotMatch(workflow, /\bsupabase db reset\b/);
assert.doesNotMatch(workflow, /--include-seed/);
assert.doesNotMatch(workflow, /--include-all/);
assert.doesNotMatch(
  workflow,
  /\bvercel\s+(?:--prod|deploy|promote|redeploy)\b/,
);
assert.doesNotMatch(
  workflow,
  /OPERATIONS_(?:CENTER|OVERVIEW|EXECUTION)\s*=\s*true/,
);

const dryRunIndex = workflow.indexOf("--dry-run");
const applyStepIndex = workflow.indexOf("name: Apply the approved migration");
assert.ok(dryRunIndex >= 0, "The workflow must generate a dry-run plan.");
assert.ok(
  applyStepIndex > dryRunIndex,
  "The migration plan must run before the apply step.",
);

const migrationTables = [
  ...migration.matchAll(/^create table if not exists ([a-z0-9_]+)/gm),
].map((match) => match[1]);
const verifierTables = [
  ...verifier.matchAll(/^\s+'(ops_[a-z0-9_]+)'[,]?$/gm),
].map((match) => match[1]);

assert.equal(migrationTables.length, 18);
assert.deepEqual(
  [...new Set(verifierTables)].sort(),
  [...migrationTables].sort(),
  "The production verifier must cover every Operations table.",
);
assert.match(verifier, /not class\.relrowsecurity/);
assert.match(verifier, /policyname = tablename \|\| '_owner_select'/);
assert.match(verifier, /public\.is_operations_owner\(uuid\)/);
assert.match(verifier, /ops_audit_events_immutable/);

type ReconciliationEntry = {
  version: string;
  file: string;
  sha256: string;
};

assert.equal(reconciliationManifest.schema_version, 1);
assert.deepEqual(
  reconciliationManifest.repair_existing.map(({ version }) => version),
  ["20260401000000"],
);
assert.deepEqual(
  reconciliationManifest.apply_before_operations.map(({ version }) => version),
  [
    "20260402000000",
    "20260402000001",
    "20260422000000",
    "20260422000001",
    "20260422000002",
    "20260422000003",
  ],
);
assert.equal(
  reconciliationManifest.deferred_operations_migration.version,
  "20260729000000",
);

for (const entry of [
  ...reconciliationManifest.repair_existing,
  ...reconciliationManifest.apply_before_operations,
  reconciliationManifest.deferred_operations_migration,
]) {
  assert.match(entry.version, /^\d{14}$/);
  assert.equal(entry.file.startsWith(`${entry.version}_`), true);
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);

  const contents = readFileSync(
    resolve(repositoryRoot, "supabase", "migrations", entry.file),
    "utf8",
  ).replace(/\r\n/g, "\n");
  assert.equal(
    createHash("sha256").update(contents).digest("hex"),
    entry.sha256,
    `Manifest hash mismatch for ${entry.file}`,
  );
}

assert.match(reconciliationWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(reconciliationWorkflow, /^\s{2}push:/m);
assert.match(
  reconciliationWorkflow,
  /concurrency:\s*\n\s+group: operations-production-database/,
);
assert.match(reconciliationWorkflow, /name: operations-production/);
assert.match(reconciliationWorkflow, /APPROVED_RECONCILIATION_SHA256/);
assert.match(reconciliationWorkflow, /APPROVED_BACKUP_REFERENCE/);
assert.match(reconciliationWorkflow, /APPROVED_CHANGE_RECORD/);
assert.match(reconciliationWorkflow, /verify-ai-upgrade\.sql/);
assert.match(reconciliationWorkflow, /verify-historical-migrations\.sql/);
assert.match(reconciliationWorkflow, /supabase migration repair/);
assert.match(reconciliationWorkflow, /\.migrations == \[\$target\]/);
assert.match(reconciliationWorkflow, /Operations migration applied: no/);
assert.doesNotMatch(reconciliationWorkflow, /\bsupabase db reset\b/);
assert.doesNotMatch(reconciliationWorkflow, /--include-seed/);
assert.doesNotMatch(
  reconciliationWorkflow,
  /\bvercel\s+(?:--prod|deploy|promote|redeploy)\b/,
);
assert.doesNotMatch(
  reconciliationWorkflow,
  /OPERATIONS_(?:CENTER|OVERVIEW|EXECUTION)\s*=\s*true/,
);

console.log("release automation safety tests passed");
