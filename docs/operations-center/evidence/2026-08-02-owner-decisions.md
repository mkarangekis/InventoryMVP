# Owner Decisions Recorded 2026-08-02

This record contains non-secret release decisions received from the repository
owner. It does not represent a deployment, database change, reviewer approval,
or production-readiness claim.

## Disposable Supabase restore

- Source project: Pourdex production (`sbfurrspsnpkaonmufwt`).
- Supported operation: Supabase Dashboard **Restore to a New Project** from the
  latest completed physical backup available when execution begins.
- Proposed disposable project name: `pourdex-ops-restore-20260802`.
- Maximum approved incremental cost: USD 2.00. Stop before creation if the
  provider-displayed estimate exceeds this amount.
- Retention: delete the disposable project 24 hours after its creation, after
  preserving non-secret verification evidence.
- Scope: isolated restore and migration/RLS/rollback rehearsal only. No
  production write, feature activation, account provisioning, or storage-file
  copy is authorized by this decision.
- Status: approved but not executed. Supabase documents this as a Dashboard
  flow, and no controllable browser is attached to the current session. No
  documented CLI or Management API equivalent was found. The deletion clock
  has therefore not started.

Current Supabase documentation also says the clone is database-only: Storage
objects/settings, Edge Functions, Auth settings/API keys, Realtime settings,
and some project configuration require separate handling. External-operation
extensions such as `pg_net`, `pg_cron`, and wrappers must be disabled on the
copy before testing to prevent unintended effects.

## Sharp advisory disposition

- Advisory: GitHub advisory `GHSA-f88m-g3jw-g9cj` / audit finding `1124066`.
- Decision: owner accepts the known high transitive Sharp risk through
  2026-08-05 inclusive.
- Exact expiry: 2026-08-05 23:59:59 America/New_York.
- Mitigations: keep the currently unused Next image-optimization path
  unconfigured; do not add `next/image`, `/_next/image`, or remote image
  patterns during the exception; retain the compatible dependency bounds; and
  rerun the production audit plus full test/build gates before release changes.
- Required follow-up: install a Next-supported patched Sharp line when
  available or obtain a new explicit disposition before the expiry. This
  exception does not waive independent review, restore, accessibility,
  migration, exact-approval, or production-observation gates.

## Reviewer nomination

The owner supplied `mkarangekis` as the reviewer username. GitHub verification
shows that this identity is the PR author, repository owner, and only direct
collaborator. It cannot provide independent review or satisfy separation of
duties. A different human GitHub identity with repository review access is
still required.

## Verification sources

- Supabase changelog checked on 2026-08-02; no clone-flow breaking change was
  found. Relevant current notices were retained for the eventual rehearsal.
- Supabase Restore to a New Project guide:
  <https://supabase.com/docs/guides/platform/clone-project>
- Supabase project deletion guide:
  <https://supabase.com/docs/guides/platform/delete-project>
- Draft PR 2 author/head/collaborator/review state verified with authenticated
  GitHub read-only queries.
