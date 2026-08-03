# Operations Center Execution Report

## Outcome

An additive, owner-only, feature-flagged Operations Center is implemented on
branch `codex/operations-center`. It is a read-only repository-evidence control
plane with policy, schema, mock/provider boundaries, runbooks, and tests. It is
dark-deployed on Vercel after the owner merged PR 1, but its database schema,
administrator grant, and feature flags are not activated or production ready.

## Current production status

The owner merged PR 1, and the configured Vercel Git integration served the new
route on both known production aliases. Public checks verified feature-off API
responses. Codex did not invoke the deployment. No migration was applied by
Codex, no feature was enabled, no administrator was granted, and no
connector/model/email/job/billing/vendor/public action ran.

## What was reverse engineered

Pourdex is a tenant/location-scoped bar operations SaaS on Next.js, Supabase,
Vercel, Stripe, Resend, POS integrations, QStash/Redis, and Anthropic product
AI. Discovery covers architecture, data flows, auth, billing, user journeys,
deployment, business model, observability, market surfaces, risks, and the
untouched-base behavioral/tooling baseline.

## What was implemented

- `/operations` inside the existing authenticated shell.
- `/api/v1/operations/access` and `/overview` with owner-only server guards.
- Default-off module/execution flags and fail-safe emergency pause.
- Deterministic Tier A–D policy and exact approval controls.
- Repository evidence, ranked work, agent, connector, approval, audit and
  baseline views with honest empty/blocked states.
- Additive Operations schema with RLS, provenance, leases, dead letters,
  encrypted credential storage, and immutable audit.
- Disabled/mock/server-only OpenAI provider boundary with structured output
  validation; no call made.
- Fail-closed cron entry authentication.
- Bounded dependency security upgrades, tests, documentation and runbooks.

## What was intentionally preserved

The existing login, customer routes, tenants, billing, POS, ingestion,
inventory, ordering, analytics, jobs, email, deployment, and Anthropic product
AI. No second identity system, database, application, or provider replacement
was introduced.

## Operations Center access

The master flag and module flag must be on. A bearer session must resolve to a
non-demo user with a tenant, exact profile `owner`, and server-controlled Auth
`app_metadata.operations_center_role = 'owner'`. API denial is server-side;
navigation appears only after the access API succeeds. Existing customer owners
remain denied by default.

## Agents and autonomy

Repository Analyst is Tier A and Change Drafter is Tier B. Both definitions are
versioned and disabled. The only executable local provider is deterministic
mock mode. No production/public/outbound/financial agent authority exists.

## Approvals and safety

Tier D is always denied. Tier C requires an approved exact payload hash,
matching action/environment, unexpired request, separate requester/approver,
and authentication no older than ten minutes. Execution is off and paused by
default. Models cannot alter these rules.

## Connectors

Local repository evidence is read-only. GitHub, OpenAI, deployment,
monitoring/support/social/email, and other external Operations connectors are
unconfigured, disabled, or unverified. Existing product integrations were not
changed or invoked.

## Tests and scans

- Untouched base: type/build/entitlement passed; whole-repo format/lint and
  dependency audit failed as documented.
- Current branch: entitlement, Operations, cron-auth, TypeScript, targeted
  lint, and Next production build pass.
- A disposable local Supabase database reproduced the production drift and
  passed exact per-migration reconciliation, the Operations apply, all 18
  schema checks, two-tenant RLS negatives, audit immutability, and postflight.
- HTTP: feature-off Operations APIs 404; feature-on unauthenticated APIs 401;
  cron without secret 401.
- Dependency audit improved from 43 to 1 high Sharp finding and remains
  nonzero; the low Babel finding is remediated with compatible
  `@babel/core` 7.29.7.
- Browser/assistive technology, hosted staging/restore, independent review, and
  production mutation checks are blocked and not claimed.

## Migrations and deployment

The Operations migration remains unapplied in production. There is no backfill.
The application revision is dark-deployed. Production has historical
migration-ledger drift; the exact repair passed locally and is encoded in a
manual protected workflow and manifest. A separate manual workflow applies the
Operations migration only after reconciliation proves it is the sole pending
file. See `25-automated-database-release.md` and
`27-production-database-reconciliation.md`. Neither workflow has run remotely.

## Open blockers

See `BLOCKERS.md`: hosted backup restore, independent review/browser QA, exact
production approvals, owner account identifiers, provider budget/two-person
approval, alerts/legal/claims ownership, and one upstream Sharp dependency
advisory. Exposed-token revocation was confirmed on 2026-08-02 and is resolved.

## Owner actions

Owner actions use the required system/value/scope/cost/verification/revoke
format in `BLOCKERS.md`. Do not provide secrets in chat.

## Rollback

Set `OPERATIONS_CENTER=false`. Abandon or revert this branch through normal
review. Leave the additive schema inert; do not drop it as routine rollback.
Keep the cron guard fail closed and repair configuration by setting/rotating
`CRON_SECRET`.

## First 30 days

Follow `23-first-30-days.md`: read-only observation, deterministic drafts,
isolated execution, one bounded staging workflow, and evidence-based outcome
review. No autonomy is earned without verified outcomes and owner approval.
