# Operations Center Execution Status

Last updated: 2026-08-03 (America/New_York)

## Current phase

Phase 27 follow-up — application code is dark-deployed; the dedicated owner
login, protected database reconciliation, and protected Operations release are
prepared in draft PR 2. The production-shaped local database rehearsal passed;
independent review, a real backup restore, and activation gates remain blocked.
The owner requested a production push on 2026-08-03; the mandatory gates were
revalidated and no production action was performed.

Dedicated implementation branch: `codex/operations-center`

Follow-up automation branch: `codex/operations-center-release-automation`

Dedicated account branch: `codex/operations-center-dedicated-login`

Draft pull request: `https://github.com/mkarangekis/InventoryMVP/pull/2`

Last audited PR head before this status update:
`15e15c1d1982e2129a0471c30354bdb8d0b6a526`

Base revision: `7bf3ec1780e13f69c1b1f617ff727dcb851ba95b`

## Completed acceptance criteria

- The master metaprompt was read completely before repository mutation.
- The repository root was confirmed as `C:\Users\mitch\Bar Optimization`.
- The initial Git state, branch, upstream, worktrees, stashes, submodules,
  remotes, and tags were inspected.
- The existing tree was clean before the dedicated implementation branch was
  created.
- Repository instruction discovery was completed. No `AGENTS.md`,
  `AGENTS.override.md`, contribution guide, security policy, architecture
  guide, CI workflow, CODEOWNERS file, or deployment runbook was found.
- Root `README.md`, `PILOT.md`, package/toolchain configuration,
  `.env.example`, Supabase/Vercel entry configuration, and ignore rules are
  active evidence sources.
- Codex performed no destructive command, production mutation, deployment,
  publication, outreach, billing action, permission expansion, or external
  write. The owner later merged PR 1, causing Vercel's configured Git
  deployment.
- Source-level environment loading and every known external/mutating command
  class were inspected.
- Phase 0 passed with a denylist for database, seed, job, deploy, connector,
  billing, email, webhook, and publication actions.
- Phase 1 discovery documents, architecture/data/auth/deployment maps, risk
  register, backlog, native integration decision, and launch assessment are
  complete.
- An untouched-base runner established the baseline before application changes.
- The Operations Center is an additive route inside the existing login and
  modular monolith; no second app, login, user store, or deployment was added.
- Operations data APIs enforce feature flag, bearer authentication,
  tenant profile, exact tenant-owner role, explicit server-controlled
  Operations-owner grant, and demo denial on the server.
- Navigation is conditional on a successful server access check.
- A dedicated Operations login and invite activation flow reuse Supabase Auth,
  prohibit self-registration from the Operations entry, validate the access API
  before redirect, and never handle the administrator's password outside
  Supabase Auth.
- The owner selected the production Operations email and `Demo Bar Group`
  tenant. The deterministic account dry-run passed with payload hash
  `0a4c4f6c3ac3e2487fd8755b733e06b06a0d321c60c17912d2611a921f02f94f`;
  no invite, account, profile, metadata grant, or password mutation occurred.
- Master and module flags default off; execution defaults off; emergency pause
  defaults on; unknown environments fail safe.
- Tier A–D policy, exact payload hashing, expiry, fresh authentication,
  separation of duties, deterministic scoring, and secret redaction are
  implemented and tested.
- The OpenAI Operations provider boundary is server-only, disabled by default,
  budget/timeout/retry bounded, structured-output based, and separate from the
  existing Anthropic product AI. No model request was made.
- Repository evidence, opportunities, agents, connectors, baseline results,
  approvals, and audit empty states are visible in a read-only owner surface.
- The additive control-plane migration models all core entities, owner-read RLS,
  service-only writes, encrypted credential bytes, leases/idempotency,
  dead letters, and immutable audit events. It was not applied.
- Both cron entry routes now fail closed when `CRON_SECRET` is absent.
- Production dependency findings were reduced from 43 (18 high) to 1 high
  finding with bounded compatible upgrades. The low Babel advisory was cleared
  by pinning compatible `@babel/core` 7.29.7; the remaining upstream Sharp risk
  has an owner-accepted exception through 2026-08-05.
- Accessibility static audit, release/rollback manifest, schema catalog,
  authorization matrix, critical runbooks, configuration guide, and first
  30-day plan are complete.
- The secure GitHub connector published draft PR 2 from a remote tree whose SHA
  exactly matched the locally tested tree.
- On 2026-08-02 the owner confirmed that the GitHub, Vercel, and Supabase tokens
  previously exposed in conversation were revoked. Only secure device/CLI
  sessions remain eligible for release work.
- Vercel's PR build completed successfully. The current preview is protected by
  Vercel SSO; direct unauthenticated requests receive the protection redirect.
- Read-only production checks verified Supabase Auth and the existing tenant
  schema are connected and healthy.
- The Operations schema remains absent. Read-only ledger inspection reported
  eight absent repository migrations, and catalog inspection proved
  migration-ledger drift; no database mutation was performed. Supabase CLI
  `2.110.0` can list project recovery metadata but its generated login-role
  endpoint currently returns `403` for migration listing.
- Eight completed physical production backups were listed read-only. The newest
  observed backup was `1278685232` at `2026-08-03T07:40:46.999Z`; PITR is off
  and no restore was invoked.
- The owner approved one disposable Supabase Restore to a New Project operation
  up to USD 2.00 and deletion 24 hours after creation. Current documentation
  confirms the operation is Dashboard-only; no browser is attached, no target
  was created, and the deletion clock has not started.
- The owner accepted the remaining Sharp advisory through 2026-08-05 inclusive
  (2026-08-05 23:59:59 America/New_York). The unused image-optimization path
  remains unconfigured. The exception does not waive any other launch gate.
- The supplied reviewer username, `mkarangekis`, is PR 2's author, repository
  owner, and only direct collaborator, so it does not satisfy independent
  review or separation of duties.
- The 2026-08-03 launch audit confirmed PR 2 remains draft with zero reviews,
  GitHub still lacks the `operations-production` environment, and the supported
  Supabase restore flow still has no attached browser.
- Vercel `inventory-mvp` is the production target. The isolated worktree is
  locally linked to a separate empty `production-release` project, so no
  deployment command may rely on the worktree-local Vercel link.
- A separate local Supabase/Postgres project reproduced the live ledger/object
  drift. The exact repair and six historical single-migration applies passed,
  including the `pos-imports` bucket correction.
- The resulting local plan contained only the Operations migration. Its apply,
  18-table verifier, two-tenant RLS matrix, negative access checks, read-only
  grants, service-role access, immutable-audit checks, and empty postflight all
  passed. The disposable database and volume were removed.
- The new reconciliation and Operations database workflows are manual-only,
  share one production concurrency group, verify exact hashes/pending sets, and
  require the protected `operations-production` environment.

## In progress

- Obtain independent review and a real Supabase backup-restore rehearsal.
- Configure the protected GitHub environment with fresh, non-chat credentials.
- Monitor the expiring Sharp exception and apply a supported patch when
  available.

## Next executable tasks

1. Review draft PR 2 and `27-production-database-reconciliation.md`.
2. Assign a GitHub reviewer other than `mkarangekis` and configure
   `operations-production` with self-review prevention and no bypass.
3. Attach an authenticated browser, inspect the displayed cost, and—only when
   it is no more than the approved USD 2.00—restore the latest completed backup
   available at execution time into `pourdex-ops-restore-20260803`; rerun the
   reconciliation/Operations/RLS sequence and delete the target 24 hours after
   creation.
4. Apply a Next-supported Sharp patch when available; otherwise stop at the
   2026-08-05 23:59:59 America/New_York exception expiry.
5. Approve the reconciliation manifest hash, run its protected `plan`, then
   separately approve `apply`.
6. Run the Operations migration workflow in `plan`; approve `apply` only when
   it contains exactly `20260729000000_operations_center.sql`.

## Tests last run

Current branch and connected-service checks, through 2026-08-03:

- `pnpm test:entitlement`: pass
- `pnpm test:operations`: pass
- `pnpm test:operations-account`: pass
- `pnpm test:cron-auth`: pass
- `pnpm test:release-automation`: pass
- `pnpm exec tsc --noEmit`: pass
- Dedicated-login targeted ESLint: zero errors
- `pnpm exec next build`: pass on Next 16.2.12; 80 routes, rerun with the
  documented synthetic Supabase public values
- Production-shaped local migration reconciliation: pass
- Operations schema verifier: 18 tables/policies/trigger pass
- Two-tenant RLS and negative-access SQL matrix: pass
- Local migration postflight: zero pending versions after rehearsal
- HTTP dedicated login: `200`, Operations heading present, signup absent
- HTTP unsafe return target: ordinary login preserved, Operations intent denied
- HTTP feature off: Operations access/overview `404`
- HTTP feature on without token: Operations access/overview `401`
- HTTP missing cron secret: nightly/nightly-check `401`
- Production dependency audit: nonzero, 1 known high Sharp finding under an
  owner-accepted exception through 2026-08-05; the low Babel finding is
  remediated with compatible `@babel/core` 7.29.7
- Sharp image-path reachability rerun: zero `next/image`, `<Image>`,
  `/_next/image`, or `remotePatterns` references
- Changed-file secret scan: pass across 17 scoped targets
- Git history secret scan: pass across 78 commits
- Browser/assistive technology: blocked; no completed interactive matrix
- GitHub workflow `actionlint` 1.7.7: pass
- GitHub PR 2 Vercel status: success at candidate `401b50f`
- Current PR preview `/operations-login`, login target, and Operations APIs:
  `302` to Vercel SSO with `noindex`; unauthenticated smoke cannot pass the
  provider protection layer
- Earlier directly accessible PR preview application smoke:
  `/operations-login` redirected to `/login?next=%2Foperations`, the target
  login returned `200`/`noindex`, and Operations APIs returned feature-off
  `{"error":"not_found"}`
- GitHub direct collaborators: one (`mkarangekis`); independent reviewer absent
- GitHub environments: `Preview`, `Production`; `operations-production` absent
- Vercel production `OPERATIONS_*` variables: none; fail-safe defaults active
- Production Supabase Auth health: `200`
- Production Supabase `tenants` read-only probe: `200`
- Production Supabase `ops_workspaces` probe: `404 PGRST205` (expected missing
  schema)
- Supabase production ledger: eight repository versions absent, comprising the
  seven-file reconciliation set plus the deferred Operations migration;
  protected reconciliation required

## Known failures that predate this work

- Whole-repository format check failed on 171 files.
- Configured `next lint` is invalid on Next 16.
- Direct whole-repository ESLint remains a pre-existing failure; the 2026-08-02
  rerun reported 93 findings (50 errors, 43 warnings).
- Baseline production audit reported 43 advisories (18 high, 20 moderate,
  5 low).
- Next inferred the wrong workspace root due an external lockfile.
- Browser runtime and database-backed integration tests were unavailable in
  the untouched baseline.

## New failures introduced by this work

None observed in available checks. The final audit remains nonzero but improved
from 43 to 1 high finding; the remaining finding has a time-bounded owner
exception through 2026-08-05. Local database integration now passes; interactive
browser, real Supabase restore/staging, independent review, and production
mutation verification remain blocked and are not claimed.

## Open approvals

- The owner confirmed the exposed credentials were revoked. General launch
  intent still does not satisfy the exact Tier C approval gate for a reviewed
  revision, environment, and payload.
- The owner requested a production push on 2026-08-03. It was not executed
  because independent review, hosted restore, accessibility, protected
  environment, and exact release-record gates remain unsatisfied.
- The USD 2.00 restore budget and 24-hour deletion are approved. The supported
  restore remains unexecuted because no browser is attached to operate the
  Dashboard and inspect its cost screen.
- The Sharp exception is accepted only through 2026-08-05 23:59:59
  America/New_York. It does not approve deployment.
- Production enablement: requested in general, but exact approval remains
  blocked behind staging, independent review, restore evidence, accessibility,
  and exact release evidence.
- Production reconciliation and Operations migration: requested in general but
  not exact-approved by revision/manifest/backup/reviewer; Tier C actions.
- Connector credentials/scopes: not requested; sensitive connections remain
  disabled or mock-only.
- Public publication, outbound activation, billing, pricing, and financial
  actions: not requested and not authorized.

## External blockers

See [`BLOCKERS.md`](BLOCKERS.md). Secure GitHub, Vercel, and Supabase sessions
are connected and exposed-token revocation is confirmed, but production
mutation remains blocked until the restore/review/security gates are complete.
The current concrete owner actions are to attach a browser and provide a
different reviewer identity. No safe local implementation work is currently
blocked.

## Migration state

`supabase/migrations/20260729000000_operations_center.sql` remains unapplied in
production. No production database command was run by Codex. The exact
reconciliation and Operations workflows are prepared on the follow-up branch;
neither has run remotely. See `27-production-database-reconciliation.md`.

## Deployment state

The owner merged PR 1 as commit
`7bf3ec1780e13f69c1b1f617ff727dcb851ba95b`. Public checks verified the new
Operations route on both known Vercel production aliases with the Operations
APIs still feature-off. Codex did not invoke that deployment. No migration,
flag enablement, administrator grant, or connector activation occurred.
The 2026-08-03 production request caused no merge, deployment, environment
change, database mutation, account grant, or feature activation.

## Rollback readiness

Set `OPERATIONS_CENTER=false` for immediate feature rollback. The migration is
additive and inert; do not drop it as routine rollback. The branch can be
abandoned without merging. Cron authentication should be repaired through
secret configuration rather than weakening the fail-closed guard.
