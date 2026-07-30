# Operations Center Blockers

Last updated: 2026-07-30

No blocker prevents further local review of the branch. The following items
block staging, production, external connections, or claims.

# Blocker: Production Supabase migration-history drift

## Blocked requirement

Applying the Operations schema and enabling the Operations Center against the
Pourdex production Supabase project.

## Evidence

Read-only checks on 2026-07-30 verified the configured project
`sbfurrspsnpkaonmufwt`: Supabase Auth returned `200`, the existing `tenants`
table returned `200`, and `ops_workspaces` returned PostgREST `PGRST205`
(missing table). The pinned Supabase CLI `2.110.0` connected through the secure
local database configuration and reported seven local migrations absent from
the remote migration ledger:

- `20260401000000_ai_upgrade.sql`
- `20260402000000_webhooks.sql`
- `20260402000001_user_prefs.sql`
- `20260422000000_pos_connections.sql`
- `20260422000001_pos_idempotency.sql`
- `20260422000002_pos_storage_bucket.sql`
- `20260729000000_operations_center.sql`

A direct read-only catalog inspection found the AI-upgrade objects and the
`pos-imports` storage bucket already present despite their versions being absent
from the ledger. The AI objects match their migration. The bucket is private
and has the expected MIME allowlist, but its file-size limit is `NULL` instead
of 100 MB; it currently contains zero objects. The webhook,
notification-preference, POS-connection, idempotency-constraint, and Operations
objects inspected were absent.

The follow-up branch adds an idempotent bucket-correction migration, making the
approved pre-reconciliation manifest eight exact versions. The repository
release workflow correctly refuses the unapproved multi-migration set.

## Why Codex cannot safely proceed

Running `supabase db push` would attempt unrelated historical migrations before
the Operations migration. Some contain non-idempotent policy or constraint
creation, while corresponding objects exist outside the ledger. Blind
application could fail mid-release, duplicate constraints, or mark the
incompatible bucket state as complete.

## Work completed around the blocker

The Supabase project, Auth service, existing tenant schema, database endpoint,
migration ledger, backup list, bucket properties, object counts, and relevant
catalog objects were verified read-only without printing or using the access
token exposed in conversation.

A separate local Supabase database reproduced the production drift and passed
the exact manifest sequence: AI object verification/history repair, six
single-file historical plans/applies, bucket correction, one-file Operations
plan/apply, 18-table schema verification, cross-tenant and negative-access RLS,
audit immutability, and an empty postflight. Protected manual workflows and the
exact manifest are documented in
`27-production-database-reconciliation.md`. No production database row, schema
object, migration record, Auth user, or feature flag was changed.

## Exact owner action

**ACTION:** assign an independent reviewer, restore backup `1239233937` or a
newer backup to an isolated target, and approve the exact reconciliation
manifest before the Operations migration is approved.
**Why it is required:** production history must match actual schema state before
an automated migration can be trusted.
**Exact system or account:** a disposable restore or Supabase branch cloned
from the Pourdex project, followed by the production project only after review.
**Exact value, permission, or decision needed:** successful isolated restore
reference, independent reviewer, exact `main` revision, manifest SHA-256
`aa4f1cb6ea441e886ae889f985dc6f1971d3ea50a6a1eef215aac0fd355bdf58`,
and separate approvals for reconciliation and the one-file Operations plan.
**Where to obtain it:** Supabase backups/branches and the repository release
review.
**Where to enter or approve it:** the protected `operations-production`
GitHub environment and release record; never in chat.
**Security scope:** database migration only, flags off, no seed data, no Auth
user creation, and no unrelated provider access.
**Expected cost:** owner must confirm any Supabase branch/restore charge.
**Verification steps:** restore to isolation; rerun both protected plans;
compare catalog and migration ledger; run the RLS matrix and schema verifier;
prove rollback/forward repair; then generate a one-migration production plan.
**Rollback or revoke steps:** discard the isolated target; leave production
unchanged and Operations flags off.
**What remains blocked until complete:** Operations schema application,
administrator provisioning, and production feature activation.

## How to verify resolution

Attach the isolated target identifier, backup/restore reference, before/after
migration list, object-level comparison, rehearsal logs, reviewer approval,
and an exact production plan containing only the approved Operations change.

## Work that resumes afterward

Run the protected production plan, separately approve the exact apply, verify
the schema, provision one dedicated owner account, and enable only the overview
flags.

# Blocker: Exposed access tokens and secure reauthentication

## Blocked requirement

Any use of the exposed credentials and any unreviewed Vercel or Supabase
administrative action.

## Evidence

On 2026-07-29, personal access tokens for GitHub, Vercel, and Supabase were
posted repeatedly in a conversation instead of being entered through an
approved local login or secret manager. The token values were not used, copied
into the repository, or placed in a command by Codex. The owner subsequently
completed secure browser/device logins for GitHub CLI, Vercel CLI, and Supabase
CLI. Each reports the intended owner account/project without printing a
credential. Revocation of the three values exposed in conversation has not been
confirmed.

## Why Codex cannot safely proceed

Conversation content and tool history are not an approved secret transport.
Credentials exposed there must be treated as compromised even if the owner
plans to rotate them after release.

## Work completed around the blocker

The linked Vercel project, Git remote, current release revision, Supabase
project, backups, and migration state were identified through secure sessions
without using the exposed tokens. Protected database workflows need none of the
exposed personal access tokens. The owner independently merged application PR

1. A secure GitHub connector published draft PR 2 and Vercel built its protected
   preview; Codex made no production deployment or production mutation.

## Exact owner action

**ACTION:** revoke all three exposed tokens immediately, record confirmation,
and retain only the fresh least-privilege CLI/secret-manager sessions.
**Why it is required:** compromised credentials cannot be used as a release
control.
**Exact system or account:** the owner-controlled GitHub, Vercel, and Supabase
accounts used for Pourdex.
**Exact value, permission, or decision needed:** revocation timestamps/token
identifiers plus fresh short-lived credentials with only the scopes required
for a reviewed staging rehearsal; never send their values in chat.
**Where to obtain it:** each provider's access-token/security settings.
**Where to enter or approve it:** `gh auth login`, `vercel login`, and
`supabase login`, or an owner-approved local secret manager.
**Security scope:** staging first, least privilege, short expiry, no unrelated
projects or organizations.
**Expected cost:** none known.
**Verification steps:** each CLI reports the intended account without printing
the credential; the revoked credentials no longer authenticate; access scope
is reviewed before any write.
**Rollback or revoke steps:** revoke the fresh credentials and remove local
sessions after the release workflow.
**What remains blocked until complete:** use of the protected credentials for
any production mutation and every final production action.

## How to verify resolution

Record revocation time, provider token identifiers (never values), authenticated
account names, scope review, expiry, and secure-session verification output.

## Work that resumes afterward

Create or select an isolated staging target and run the non-production release
rehearsal.

# Blocker: Staging and production environment authority

## Blocked requirement

Staging rehearsal, production topology verification, preview/deployment,
production smoke tests, alerts, and post-release observation.

## Evidence

The owner identified the existing `inventory-mvp` Vercel production project,
GitHub `mkarangekis/InventoryMVP` repository, and Pourdex Supabase production
project. The local Vercel link matches `inventory-mvp`; the Supabase project is
in East US (Ohio). Secure GitHub, Vercel, and Supabase CLI sessions are
connected. Vercel production aliases and the dark deployment revision were
verified read-only. Supabase reports no database branch. GitHub reports only
the existing `Preview` and `Production` environments;
`operations-production` is absent. Vercel production has no `OPERATIONS_*`
variables, so code defaults keep the feature off. No isolated hosted restore,
approved staging account, independent reviewer, browser session, or
`.openai/hosting.json` exists in the available repository/session.

## Why Codex cannot safely proceed

Creating a Supabase branch/restore can incur cost and requires a target/retention
decision. General launch intent does not replace the exact revision,
payload, reviewer, and backup approvals required by the master specification.

## Work completed around the blocker

The application builds locally with synthetic settings; feature-off and
unauthorized production HTTP behavior are verified. The production-shaped
database rehearsal, provider topology audit, protected workflows, release, and
rollback steps are complete. The protected Vercel preview serves
`/operations-login` as a redirect to `/login?next=%2Foperations`; that login
returns `200` with `noindex`, while both Operations APIs return the intended
feature-off JSON.

## Exact owner action

**ACTION:** identify the staging and production systems and authorize a staging
rehearsal.
**Why it is required:** environment identity and deployment rights cannot be
inferred.
**Exact system or account:** the owner-controlled `inventory-mvp` Vercel
project and a separate/disposable Supabase staging project; the identified
Pourdex database remains production.
**Exact value, permission, or decision needed:** an approved non-production
restore target/cost, branch/preview mapping, read-only observability access,
independent reviewer, and approval for the exact merged revision with
Operations flags off.
**Where to obtain it:** Vercel/Supabase project settings.
**Where to enter or approve it:** secure deployment configuration and release
approval system, never chat.
**Security scope:** staging first, least privilege, no production write.
**Expected cost:** owner/platform operator must confirm.
**Verification steps:** confirm project/region/branch, deploy flags off, inspect
revision, run smoke/negative tests.
**Rollback or revoke steps:** revoke temporary access and remove preview.
**What remains blocked until complete:** staging, deployment, production and
observation criteria.

## How to verify resolution

Record the target identifiers, approver, exact revision, flag manifest, preview
URL, smoke results, and revoked temporary access.

## Work that resumes afterward

Hosted restore verification, browser/accessibility testing, preview QA, alert
verification, and release review.

# Blocker: Explicit Operations administrator grant

## Blocked requirement

Positive authenticated access in staging and any owner inspection of the
control plane.

## Evidence

The new guard requires both tenant ownership and server-controlled Supabase
Auth `app_metadata.operations_center_role = 'owner'`. No account has been
granted that permission, and Codex did not broaden any user's access.

## Why Codex cannot safely proceed

Selecting a platform administrator and changing Auth app metadata is a
permission expansion that requires exact owner authority.

## Work completed around the blocker

The server guard, matching RLS JWT check, demo denial, unknown-role denial,
conditional navigation, revocation behavior, dedicated `/operations-login`
entry, private password-activation page, dry-run invitation command, and
negative unit/HTTP tests are implemented.

## Exact owner action

**ACTION:** provide one non-secret staging email and approve its exact
tenant/account Operations-owner grant.
**Why it is required:** all existing customer owners intentionally remain
denied.
**Exact system or account:** one new owner-selected staging Supabase Auth user.
**Exact value, permission, or decision needed:** the invitation email and
tenant UUID, plus approval to create a new profile with role `owner` and set
only `app_metadata.operations_center_role = 'owner'`; do not provide a password
or place the grant in user-editable metadata.
**Where to obtain it:** Supabase Auth user administration.
**Where to enter or approve it:** email/tenant may be provided as non-secret
identifiers; credentials stay in a secure admin/CI environment and the password
is set privately through the invitation page.
**Security scope:** one staging account, least privilege, time-bounded.
**Expected cost:** none known.
**Verification steps:** refresh session, positive access, second tenant and
ordinary-owner negatives, audit record.
**Rollback or revoke steps:** remove the app-metadata key, revoke sessions, and
verify API 403/navigation hidden.
**What remains blocked until complete:** positive staging access and interactive
owner QA.

## How to verify resolution

Record approver, account ID (not credentials), environment, grant timestamp,
positive/negative results, expiry, and revocation test.

## Work that resumes afterward

Owner UI inspection, authenticated tenant-scope tests, and approval UX rehearsal
in staging.

# Blocker: Database rehearsal and restore evidence

## Blocked requirement

Migration application, RLS integration, backup/restore evidence, production
data compatibility, and destructive recovery rehearsal.

## Evidence

The additive migration remains unapplied in production. A disposable local
Supabase database completed the production-shaped migration and RLS rehearsal.
Seven completed production physical backups were listed read-only; the newest
observed backup is `1239233937` from `2026-07-29T07:46:06.313Z`. No Supabase
backup has been restored to an isolated hosted target, and PITR is disabled.

## Why Codex cannot safely proceed

The local rehearsal does not prove that Supabase's hosted backup can be
restored or that the restored production data is compatible. Restore authority,
target cost, and destructive recovery remain owner/platform decisions.

## Work completed around the blocker

The schema, constraints, RLS, immutable audit trigger, indexes, migration
sequence, rollback strategy, restore runbook, production-shaped reconciliation,
two-tenant negative RLS matrix, and postflight are complete.

## Exact owner action

**ACTION:** restore backup `1239233937` or a newer backup into a disposable
Supabase project/branch and rerun the protected plan plus verification suite.
**Why it is required:** SQL/RLS/restore behavior requires a real isolated
database.
**Exact system or account:** owner-controlled non-production Supabase project.
**Exact value, permission, or decision needed:** approved restore target/cost,
restore job/reference, temporary migration access, two synthetic tenants with
owner/non-owner users, and independent reviewer disposition.
**Where to obtain it:** Supabase project and backup settings.
**Where to enter or approve it:** secure CI/staging secrets and release record.
**Security scope:** non-production, synthetic data only.
**Expected cost:** platform owner must confirm.
**Verification steps:** restore; compare schema/counts; run reconciliation,
Operations, positive/negative RLS, and rollback/forward-repair checks; revoke
temporary credentials.
**Rollback or revoke steps:** delete disposable project/credentials; migration
remains unapplied elsewhere.
**What remains blocked until complete:** database and restore readiness gates.

## How to verify resolution

Attach migration logs, RLS test results, backup/restore IDs and times, data
comparison, and credential revocation.

## Work that resumes afterward

Staging persistence adapters, audit-chain integration, schedule/lease tests,
and migration approval review.

# Blocker: Independent review and interactive accessibility QA

## Blocked requirement

Independent code/security review, browser screenshots, keyboard/zoom/mobile
verification, and NVDA/VoiceOver evidence.

## Evidence

The isolated browser controller reported no available browser. GitHub reports
only one direct repository collaborator, `mkarangekis`, with admin access. No
second reviewer identity or pull request approval is available, so the required
environment reviewer and self-review prevention cannot yet be configured.

## Why Codex cannot safely proceed

The implementing agent cannot be its own independent reviewer, and static
inspection cannot substitute for real assistive technology.

## Work completed around the blocker

Targeted lint, type, tests, builds, contrast calculations, semantic inspection,
responsive CSS, focus styles, 44px targets, reduced motion, and explicit state
copy are complete.

## Exact owner action

**ACTION:** assign an independent reviewer and run the staging accessibility
matrix.
**Why it is required:** separation of implementation and approval plus manual
WCAG coverage.
**Exact system or account:** reviewed branch/PR and supported desktop/mobile
browsers with NVDA or VoiceOver.
**Exact value, permission, or decision needed:** a second GitHub username with
appropriate repository review access, plus approve/reject findings and recorded
keyboard, 200% zoom, screen-reader, responsive, and error-state results.
**Where to obtain it:** engineering/security/design reviewer and staging QA.
**Where to enter or approve it:** PR review and evidence record.
**Security scope:** preview/staging only.
**Expected cost:** internal review time.
**Verification steps:** attach findings, fixes, reruns, and approval.
**Rollback or revoke steps:** reject the release and keep flags off.
**What remains blocked until complete:** independent review and full
accessibility verification.

## How to verify resolution

Record reviewer identity, revision, checklist, defects, reruns, and disposition.

## Work that resumes afterward

Launch gate review and exact production approval request.

# Blocker: External providers, approval governance, and financial authority

## Blocked requirement

Real OpenAI runs, GitHub/monitoring/support/social/email connections, Tier C
execution, live publication/outreach, billing/pricing, purchasing, or spending.

## Evidence

All adapters/registries are disabled or unconfigured. No Operations model was
selected, no Operations-specific key/budget was authorized, no external scopes
were approved, and the existing role model has no rehearsed second approver.

## Why Codex cannot safely proceed

Connections broaden permissions; model calls and other actions can incur cost;
Tier C needs exact approval, fresh authentication, and separation of duties.

## Work completed around the blocker

The OpenAI Responses adapter, disabled/mock providers, structured validation,
prompt-injection envelope, budgets, timeout/retry bounds, encrypted credential
schema, connector registry, approval hashing, expiry, and separation tests are
complete. No external call was made.

## Exact owner action

**ACTION:** select one staging-only provider workflow, its model/budget/scopes,
and two-person approval governance.
**Why it is required:** credentials, spending, permissions, and approval roles
are owner decisions.
**Exact system or account:** the specific provider account and application
staging environment.
**Exact value, permission, or decision needed:** explicit model, monthly/per-run
budget, least-privilege scopes, secret owner, rotation policy, requester and
separate approver.
**Where to obtain it:** provider admin/billing/security settings.
**Where to enter or approve it:** secure secret manager and approval system,
never chat.
**Security scope:** staging and read-only first; no customer content unless
separately approved.
**Expected cost:** owner must set a hard cap before activation.
**Verification steps:** scope inspection, revoke test, budget/cost attribution,
schema/injection evals, and approval tamper tests.
**Rollback or revoke steps:** disable mode/connector, pause execution, revoke
token, rotate secret.
**What remains blocked until complete:** real agents/connectors and every live,
public, outbound, financial, pricing, or billing action.

## How to verify resolution

Record provider, scopes, model, budgets, secret location (not value), approvers,
revoke test, and staging results.

## Work that resumes afterward

One bounded read-only staging integration and its eval suite.

# Blocker: Alert routing, retention/legal decisions, and public claims

## Blocked requirement

Actionable routed alerts, legally approved retention/deletion, privacy
responses, public claims/customer proof, and public go-to-market activation.

## Evidence

No on-call/support destination, legal/privacy owner, jurisdiction, retention
decision, customer consent, or substantiation reviewer is named.

## Why Codex cannot safely proceed

These choices affect people, legal obligations, public representations, and
customer data.

## Work completed around the blocker

Alert conditions, incident runbooks, proposed retention windows, data classes,
claims risks, internal-only experiment rules, and owner-action format are
documented. No message or publication occurred.

## Exact owner action

**ACTION:** name alert, privacy/legal, and claims owners and approve exact
policies before activation.
**Why it is required:** routing and legal/public authority cannot be inferred.
**Exact system or account:** incident platform, privacy/legal process, and
publication channels.
**Exact value, permission, or decision needed:** destinations/severities,
retention periods/legal holds, jurisdictional process, claim source/consent and
reviewer.
**Where to obtain it:** owner, legal/privacy counsel, support/on-call, and brand
governance.
**Where to enter or approve it:** secure incident, policy, and claims manifest
systems.
**Security scope:** metadata/minimum necessary; no raw secrets/customer proof in
chat.
**Expected cost:** owner/counsel must confirm.
**Verification steps:** send only a staging test alert, rehearse one privacy
case, and approve a non-public claims manifest.
**Rollback or revoke steps:** disable routing/publication, revoke channel
tokens, restore prior policy version.
**What remains blocked until complete:** alert, privacy/legal, and public claims
gates.

## How to verify resolution

Attach owner identities, approved policy versions, staging alert evidence,
privacy rehearsal, and claims manifest.

## Work that resumes afterward

Alert tests, retention enforcement, privacy workflow tests, and draft-only
go-to-market validation.

# Blocker: Two upstream production dependency advisories

## Blocked requirement

A zero-advisory production dependency gate.

## Evidence

After bounded upgrades the audit reports two findings: one high inherited
`sharp` advisory (`1124066`) and one low inherited Babel advisory (`1123528`).
The current published Next 16.2.12 declares `sharp ^0.34.5`, while the patch is
`>=0.35.0`; the named Babel patch `7.29.1` is not published. The branch reduced
findings from 43 to 2.

## Why Codex cannot safely proceed

Forcing an unsupported Sharp major or unpublished Babel version would weaken
compatibility rather than prove security.

## Work completed around the blocker

Next, Supabase, Drizzle, Anthropic, and Resend were upgraded; PostCSS and `qs`
were pinned to patched compatible versions. Tests, TypeScript, targeted lint,
and production build pass.

## Exact owner action

**ACTION:** accept the time-bounded upstream risk or wait for a Next/styled-jsx
release that declares the patched versions.
**Why it is required:** production risk acceptance belongs to the owner/security
reviewer.
**Exact system or account:** repository dependency policy and release gate.
**Exact value, permission, or decision needed:** expiry date and reviewer
disposition for both advisory IDs, or approval for a supported upstream update.
**Where to obtain it:** security/dependency review.
**Where to enter or approve it:** PR/release risk record.
**Security scope:** no forced transitive major override.
**Expected cost:** none known beyond review/update effort.
**Verification steps:** rerun `pnpm audit --prod --audit-level=low` and full
build/test gates on the supported update.
**Rollback or revoke steps:** revert dependency revision if compatibility
regresses.
**What remains blocked until complete:** clean dependency scan and production
security gate.

## How to verify resolution

Audit exits zero or an owner/security reviewer records explicit, expiring risk
acceptance with mitigations.

## Work that resumes afterward

Final production security gate review.
