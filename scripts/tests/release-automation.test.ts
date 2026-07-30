import assert from "node:assert/strict";
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
const verifier = readFileSync(
  resolve(
    repositoryRoot,
    "scripts",
    "operations",
    "verify-operations-schema.sql",
  ),
  "utf8",
);

assert.match(workflow, /branches:\s*\n\s+- main/);
assert.match(workflow, /workflow_dispatch:/);
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

console.log("release automation safety tests passed");
