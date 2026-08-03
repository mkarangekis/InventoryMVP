# Production Launch Audit — 2026-08-03

## Request and outcome

The owner requested a production push on 2026-08-03. The request was treated as
production intent, not as permission to bypass the launch gates in the master
specification. No merge, production deployment, database mutation, environment
variable change, permission grant, account creation, or feature activation was
performed.

## Exact candidate

- Draft pull request: <https://github.com/mkarangekis/InventoryMVP/pull/2>
- Candidate before this evidence-only update:
  `15e15c1d1982e2129a0471c30354bdb8d0b6a526`
- Base: `main` at `7bf3ec1780e13f69c1b1f617ff727dcb851ba95b`
- GitHub reports the PR as open, draft, mergeable, and clean.
- Vercel and Vercel Preview Comments checks passed on the candidate.

## Unsatisfied mandatory gates

### Independent review

PR 2 has no reviews. `mkarangekis` is its author, the repository owner, and the
only direct collaborator. GitHub has only `Preview` and `Production`
environments, neither with protection rules; the required
`operations-production` environment does not exist. A different human reviewer
with repository review access is still required.

### Hosted restore rehearsal

Supabase backup `1278685232`, created at `2026-08-03T07:40:46.999Z`, is the
newest completed physical backup observed. PITR remains disabled. No hosted
restore has been performed.

Supabase CLI 2.111.0 command discovery confirms that `projects` supports
list/create/api-keys/delete and `backups` supports list/PITR restore; neither
provides Restore to a New Project. The documented clone remains a Dashboard
workflow. Browser discovery returned no available browser, so the
provider-displayed price cannot be inspected and the approved USD 2.00
operation cannot safely start. No target exists and the approved 24-hour
deletion clock has not started.

The Supabase changelog was checked on 2026-08-03. A 2026-07-30 fix now reapplies
current credentials after physical restores and scopes clone status transitions
correctly. This improves the platform restore path but does not replace evidence
from an actual restore rehearsal.

### Deployment target integrity

The Git-integrated production project is Vercel `inventory-mvp`. Its newest
ready production deployment observed on 2026-08-03 remains the dark deployment
from `main`, and it has no `OPERATIONS_*` production variables.

The isolated release worktree's local `.vercel` link instead points to a
different project named `production-release`, which has no environment
variables. Production commands must not use that worktree-local link. Any
eventual deployment must bind explicitly to `inventory-mvp` and verify the
project, team, revision, aliases, and flag manifest before execution.

## Active exception

The owner-accepted Sharp advisory exception remains valid only through
2026-08-05 23:59:59 America/New_York. It does not waive review, restore,
accessibility, migration, exact-approval, or observation gates.

## Candidate revalidation

- Entitlement, Operations Center, Operations account, cron authentication, and
  release-automation safety tests: pass.
- TypeScript (`tsc --noEmit`): pass.
- Next 16.2.12 production build: pass, 80 routes, using the documented
  non-secret synthetic Supabase public values. The first isolated build attempt
  compiled and type-checked but correctly stopped during prerender because no
  public Supabase values were present; no production credentials were imported.
- Production dependency audit: expected nonzero result with exactly the one
  high Sharp advisory covered by the active exception.
- Sharp image-path reachability scan: zero `next/image`, `<Image>`,
  `/_next/image`, or `remotePatterns` references.

## Required owner actions

1. Add a GitHub reviewer other than `mkarangekis` with review access.
2. Attach an authenticated browser through Settings → Computer use so the
   supported Supabase restore can be created after confirming the displayed
   cost is at most USD 2.00.
3. After the restore, migration/RLS rehearsal, accessibility QA, and independent
   review pass, approve the exact final commit, database manifests, Vercel
   `inventory-mvp` target, flag manifest, and rollback plan through the
   protected release record.

## Sources

- Supabase changelog: <https://supabase.com/changelog.md>
- Restore credential fix:
  <https://supabase.com/changelog/restore-credential-resync>
- Restore to a New Project:
  <https://supabase.com/docs/guides/platform/clone-project>
