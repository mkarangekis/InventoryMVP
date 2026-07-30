# Compatibility and Release Manifest

## Change set

- Add owner-only Operations route and two API endpoints.
- Add pure authorization, approval, scoring, redaction, and model-boundary
  modules.
- Add repository-evidence fixtures and disabled/mock agent definitions.
- Add one unapplied, additive Operations migration and one idempotent storage
  bucket configuration correction required by observed production drift.
- Make two cron entry guards fail closed.
- Upgrade vulnerable dependencies within supported release lines.
- Add Operations, entitlement, and cron authorization tests.

## Preserved behavior

- Existing login, Supabase session, tenants, locations, billing, POS, inventory,
  ordering, analytics, email, Anthropic product AI, and customer routes.
- Existing production flags and subscriptions.
- Existing application data; historical migration files remain unchanged.
- No connector, job, email, vendor order, billing, or model call was invoked.

## Compatibility boundaries

- Operations flags default off; the new route cannot expose data without the
  owner API guard.
- Historical reconciliation adds missing tables/constraints that repository
  code already expects. The storage correction changes only the empty,
  private `pos-imports` bucket limit from unlimited to 100 MB.
- The new migration needs no backfill.
- The cron change affects only a misconfigured deployment without
  `CRON_SECRET`; that state now fails closed.
- Dependency updates passed TypeScript, all available unit tests, targeted
  lint, and the production build.

## Release state and sequence

The owner merged PR 1 on 2026-07-29. Vercel served the new `/operations` route
from both known production aliases, while both Operations APIs returned the
intended feature-off JSON `404`. This verified a dark application deployment.
The Supabase migration remained unapplied and no flag or administrator grant
was changed during that verification.

Remaining sequence:

1. Revoke the access tokens exposed in conversation.
2. Independent review the branch diff and security results.
3. Review the completed local production-shaped migration/RLS rehearsal.
4. Restore a current production backup to a disposable Supabase target and
   rerun the exact reconciliation/Operations/RLS sequence.
5. Confirm backup and restore evidence.
6. Configure the protected GitHub environment in
   `25-automated-database-release.md`.
7. Run and approve the historical reconciliation workflow described in
   `27-production-database-reconciliation.md`.
8. Run and inspect the exact one-file Operations migration plan.
9. Approve and verify the additive Operations migration while every flag remains
   off.
10. Grant one named Operations owner and rehearse revocation in staging.
11. Separately enable only `OPERATIONS_CENTER` and `OPERATIONS_OVERVIEW`, then
    run access, tenant-isolation, accessibility, and responsive checks.

## Rollback

Immediate rollback is to set `OPERATIONS_CENTER=false`. This removes navigation
and causes Operations APIs to return 404 without touching customer features.
If the cron guard causes an expected job to return 401, configure/rotate
`CRON_SECRET`; do not remove the guard. Revert the application revision only
through the normal reviewed release process. Leave additive tables in place;
dropping them is destructive and requires a separate approved retention plan.

## Observation window

After any approved release: 30 minutes continuous observation, then checks at
2 hours, 24 hours, and 7 days for authorization denials, cross-tenant evidence,
error rate, queue health, costs, and customer workflow regressions.
