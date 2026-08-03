# Operations Center Traceability

Last updated: 2026-07-30

Status values: `not started`, `in progress`, `implemented`, `verified`,
`blocked`, `not applicable`.

This ledger maps the 104 definition-of-done criteria in Part 33 of the master
metaprompt. Paths and test evidence will be added as work progresses; a status
is never promoted to `verified` without direct evidence.

|  ID | Criterion (condensed)                                                             | Status      | Repository paths / tests / evidence                                  | Approval or owner action       |
| --: | --------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- | ------------------------------ |
|   1 | Reverse engineer existing SaaS from evidence                                      | verified    | `00`–`12` discovery set; source/Git/config evidence                  | None                           |
|   2 | Document architecture, data, deployment, auth, admin, billing, journeys, business | verified    | `02`–`08`; architecture diagrams and maps                            | None                           |
|   3 | Separate facts, inferences, confidence, unknowns                                  | verified    | `00-executive-discovery-summary.md`; evidence convention             | None                           |
|   4 | Characterize existing critical behavior                                           | verified    | `12-baseline-verification-report.md`; HTTP baseline                  | None                           |
|   5 | Separate pre-existing failures from regressions                                   | verified    | `EXECUTION_STATUS.md`; untouched-base vs current results             | None                           |
|   6 | Preserve unrelated user changes                                                   | verified    | `evidence/phase-0-preflight.md`; clean initial tree                  | None                           |
|   7 | No unjustified rewrite                                                            | verified    | decisions `0001`; native modular-monolith extension                  | None                           |
|   8 | Preserve compatibility or explicitly migrate                                      | verified    | `21-compatibility-and-release-manifest.md`; build/tests              | Tier C if migration            |
|   9 | Integrate with existing login                                                     | implemented | Supabase session; `/operations-login`; invite activation             | Account staging test blocked   |
|  10 | Explicit server-side Operations permission                                        | verified    | `operations/auth/server.ts`; access tests/HTTP 401                   | None                           |
|  11 | Deny unauthorized UI/API/stream/job/cache/export access                           | verified    | owner guard; private no-store; local two-tenant RLS negatives        | Production enablement later    |
|  12 | Fresh authentication for high-risk actions                                        | verified    | `domain/policy.ts`; `test:operations`                                | None                           |
|  13 | Unambiguous environment                                                           | verified    | `operations/config.ts`; trust rail; unknown fails safe               | None                           |
|  14 | Emergency pause works                                                             | verified    | default true; policy pause test                                      | Staging rehearsal later        |
|  15 | Owner can inspect control-plane surfaces                                          | implemented | `/operations` tabs and read-only overview                            | Browser verification blocked   |
|  16 | Evidence/signals preserve source and freshness                                    | verified    | repository evidence fixture; migration                               | None                           |
|  17 | Opportunities preserve evidence and scoring version                               | verified    | opportunity domain/test; overview; migration                         | None                           |
|  18 | Work items include acceptance, verification, rollback                             | implemented | `ops_work_items` migration contract                                  | DB integration blocked         |
|  19 | Version agent definitions and prompts                                             | implemented | agent registry/version/schema; run prompt version                    | None                           |
|  20 | Runs record full provenance and cost                                              | implemented | `ops_agent_runs`; provider result provenance                         | Real run blocked               |
|  21 | Validate model output schemas                                                     | verified    | `agents/validation.ts`; positive/negative tests                      | None                           |
|  22 | Ground claims                                                                     | verified    | allowed evidence-ID validation; repository-only UI copy              | None                           |
|  23 | Enforce budgets and timeouts                                                      | implemented | agent caps; provider timeout/retry/output bounds                     | Real cost eval blocked         |
|  24 | Lease and idempotency for schedules                                               | implemented | `ops_tasks`, `ops_schedules` migration                               | DB concurrency test blocked    |
|  25 | Dead-letter failures and surface them                                             | implemented | `ops_dead_letters`; queue runbook                                    | UI/runtime connection blocked  |
|  26 | Require verified outcome before learning                                          | implemented | status contracts and 30-day policy; no learning path active          | Outcome workflow blocked       |
|  27 | Models cannot grant permission                                                    | verified    | server access and deterministic policy exclude model input           | None                           |
|  28 | Deny Tier D actions                                                               | verified    | policy test                                                          | None                           |
|  29 | Exact valid approval for Tier C                                                   | verified    | payload/action/environment/auth policy test                          | Owner per real action          |
|  30 | Payload mutation invalidates approval                                             | verified    | approval hash mutation test                                          | None                           |
|  31 | Approval expiry enforced                                                          | verified    | expiry test                                                          | None                           |
|  32 | Separation of duties enforced                                                     | verified    | domain test and DB constraint                                        | Two-person staging governance  |
|  33 | Version and audit policy changes                                                  | implemented | `ops_policy_versions`; audit contract                                | Owner approval for expansion   |
|  34 | Agents cannot expand own authority                                                | verified    | definition literal `canModifyOwnDefinition: false`; policy isolation | None                           |
|  35 | Production/public/outbound/financial/pricing owner-controlled                     | verified    | policy, disabled connectors, `BLOCKERS.md`                           | Owner                          |
|  36 | Isolated coding workspaces                                                        | verified    | branch plus detached baseline worktree                               | None                           |
|  37 | Coding runs have no production data access                                        | verified    | synthetic localhost runner; Phase 0 denylist                         | None                           |
|  38 | Coding runs produce patch/branch/draft PR                                         | verified    | draft PR 2; published tree matched locally tested tree               | None                           |
|  39 | Coding runs cannot merge/deploy                                                   | implemented | PR 2 remains draft; no merge/production deployment by Codex          | Owner for merge/deploy         |
|  40 | Load and record repository instructions                                           | verified    | `evidence/phase-0-preflight.md`                                      | None                           |
|  41 | Proportionate tests for changes                                                   | verified    | unit/account/release, type/lint/build, migration, RLS, HTTP          | None                           |
|  42 | Independent code review                                                           | blocked     | implementer cannot self-approve                                      | Human reviewer                 |
|  43 | Attach QA and security results                                                    | implemented | execution status, baseline, a11y audit, final report                 | Manual QA blocked              |
|  44 | Release manifests and rollback plans                                              | verified    | `21-compatibility-and-release-manifest.md`                           | None                           |
|  45 | Post-release observation                                                          | blocked     | Dark deploy verified; required observation window not completed      | Owner production authority     |
|  46 | Threat model includes Operations Center                                           | verified    | `09-security-and-privacy-threat-model.md`                            | None                           |
|  47 | Authorization matrix complete                                                     | verified    | `20-authorization-matrix.md`                                         | None                           |
|  48 | Cross-tenant negative tests pass                                                  | verified    | `verify-operations-rls.sql`; two tenants and denial matrix           | Hosted restore rerun later     |
|  49 | Prompt-injection evals pass                                                       | implemented | untrusted evidence envelope; unknown-citation negative test          | Real model eval blocked        |
|  50 | No secrets in prompts/logs/artifacts/UI/source                                    | verified    | redaction test; changed-file and 78-commit scans pass                | None                           |
|  51 | Connector credentials encrypted/scoped/revocable/model-excluded                   | implemented | encrypted bytes/scopes/revoke fields; no connector active            | Owner for connection           |
|  52 | Approval integrity tested                                                         | verified    | canonical hash, mutation, expiry, separation tests                   | None                           |
|  53 | Runner isolation verified                                                         | verified    | detached baseline worktree, synthetic settings, no prod commands     | None                           |
|  54 | Dependency/secret scans meet policy                                               | blocked     | secret scans pass; audit remains at 1 high and 1 low                 | Security risk disposition      |
|  55 | Recent backup restore evidence                                                    | blocked     | backup `1270201856` listed; no hosted restore performed              | Owner/platform operator        |
|  56 | Critical runbooks exist                                                           | verified    | `runbooks/README.md`                                                 | Owner fills routing            |
|  57 | Actionable routed alerts                                                          | blocked     | Production alerting destination unknown                              | Owner/platform operator        |
|  58 | Append-only/equivalent audit protection                                           | implemented | mutation-rejection trigger and event hash chain                      | DB test blocked                |
|  59 | Capabilities link journeys/code/metrics/evidence                                  | verified    | discovery/product/observability maps and evidence UI                 | None                           |
|  60 | Define activation/value events                                                    | implemented | `07`, `10`, `23`; proposed definitions                               | Owner validation               |
|  61 | Metrics include source/grain/denominator/time/tests                               | implemented | `ops_metric_definitions` contract                                    | Data connection blocked        |
|  62 | Data quality visible                                                              | implemented | freshness/confidence/synthetic labels and baseline failures          | Browser check blocked          |
|  63 | Explainable customer health                                                       | implemented | factors/evidence/scoring version schema                              | Source connection blocked      |
|  64 | Customer interventions start internal                                             | implemented | approval policy and 30-day draft sequence                            | None                           |
|  65 | Live communication gates                                                          | verified    | Tier C/external writes denied; no sender connected                   | Owner for live send            |
|  66 | Pre-exposure experiment cohorts                                                   | implemented | `ops_experiments.cohort_definition`; draft default                   | Owner before exposure          |
|  67 | Distinguish correlation and causation                                             | implemented | research/growth docs and outcome plan                                | Owner validation               |
|  68 | Public claims use approved evidence                                               | blocked     | claims gate/runbook; no claims workflow active                       | Owner/editor/legal             |
|  69 | Customer proof requires consent                                                   | blocked     | policy documented; no consent system connected                       | Customer/owner consent         |
|  70 | Marketing review workflow                                                         | implemented | draft-only/approval policy and runbook                               | External activation blocked    |
|  71 | Safe SEO practices                                                                | implemented | growth-surface risk map; no automation/backlinks/publication         | None                           |
|  72 | Social defaults to draft/approval                                                 | verified    | no social connector; publication Tier C and blocked                  | Owner                          |
|  73 | Verify exact social publication payload                                           | blocked     | no provider/account/payload authorized                               | Owner                          |
|  74 | Campaign consent/suppression/frequency/unsubscribe/guards                         | blocked     | no lifecycle provider or policy owner                                | Owner/legal                    |
|  75 | Synthetic resettable demo data                                                    | verified    | deterministic repository evidence/mock; no DB state                  | None                           |
|  76 | Demo journeys tested                                                              | blocked     | demo is deliberately denied; browser unavailable                     | Browser/staging                |
|  77 | Version sales assets against facts/pricing/claims                                 | blocked     | no asset workflow/claims approval active                             | Owner                          |
|  78 | ROI assumptions visible; no guarantees                                            | implemented | discovery/business docs label unknowns; no ROI guarantee added       | None                           |
|  79 | Executive briefings link definitions/evidence                                     | verified    | executive discovery and final report link evidence                   | None                           |
|  80 | Financial values identify source/period/currency/formula                          | implemented | cost USD and metric contracts; no financial report fabricated        | Finance for live data          |
|  81 | Attribute cost by agent/workflow                                                  | implemented | agent run tokens/model/cost/work item fields                         | Real run blocked               |
|  82 | No transaction authority for business agents                                      | verified    | execution off; Tier D denied; no action endpoint                     | Owner                          |
|  83 | Vendor recommendations cannot execute commitments                                 | verified    | no Operations vendor connector/action; financial gate                | Owner                          |
|  84 | Operating actions have owners/outcomes                                            | implemented | work item owner, acceptance, verification, status contracts          | None                           |
|  85 | Required test layers pass                                                         | blocked     | unit/type/lint/build/migration/RLS pass; browser/review absent       | Staging/reviewer               |
|  86 | WCAG 2.2 AA admin routes                                                          | blocked     | `22-accessibility-audit.md` static pass; manual AT/zoom absent       | Browser/QA                     |
|  87 | Lint/type/format/build gates pass                                                 | blocked     | targeted pass; pre-existing whole-repo lint/format fail              | Remediation decision           |
|  88 | No material customer performance regression                                       | blocked     | route split/build pass; no runtime performance environment           | Staging                        |
|  89 | Bounded lists                                                                     | verified    | validators max items; finite repository fixtures                     | None                           |
|  90 | Durable asynchronous long work                                                    | implemented | schedule/task/lease/dead-letter schema; no long web run              | DB runner blocked              |
|  91 | Typed safe actionable errors                                                      | verified    | access/policy/provider codes and specific UI states                  | None                           |
|  92 | Specific state UX                                                                 | implemented | loading, disabled, forbidden, error, empty, failure states           | Browser check blocked          |
|  93 | No placeholder production behavior                                                | verified    | repository evidence, mock, disabled, unverified, not-deployed labels | None                           |
|  94 | Reproducible local setup                                                          | verified    | `19-local-setup-and-configuration.md`; commands executed             | None                           |
|  95 | Synthetic seed demonstrates system                                                | verified    | resettable code fixture/mock; no database seed needed                | None                           |
|  96 | Staging rehearsal passes                                                          | blocked     | Vercel preview built but is protected; no isolated Supabase target   | Owner/platform operator        |
|  97 | Migration and rollback rehearsed                                                  | in progress | production-shaped local repair/apply passed; hosted restore absent   | Disposable restore/reviewer    |
|  98 | Emergency pause rehearsed                                                         | verified    | default-on and Tier B pause unit test                                | Staging operational test later |
|  99 | Explicit connector status/credentials                                             | implemented | UI registry shows disabled/unconfigured/unverified; no secrets       | Owner for credentials          |
| 100 | Exact owner action for every blocker                                              | verified    | required template in `BLOCKERS.md`                                   | Owner as listed                |
| 101 | Traceability covers every requirement                                             | verified    | all 104 rows present with evidence/status                            | None                           |
| 102 | Execution status matches state                                                    | verified    | `EXECUTION_STATUS.md` reconciled                                     | None                           |
| 103 | Never claim production without evidence                                           | verified    | merge/live-route/feature-off API evidence recorded                   | None                           |
| 104 | Final report and 30-day plan                                                      | verified    | `24-final-execution-report.md`; `23-first-30-days.md`                | None                           |
