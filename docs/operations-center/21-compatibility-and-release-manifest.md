# Compatibility and Release Manifest

## Change set

- Add owner-only Operations route and two API endpoints.
- Add pure authorization, approval, scoring, redaction, and model-boundary
  modules.
- Add repository-evidence fixtures and disabled/mock agent definitions.
- Add one unapplied, additive Supabase migration.
- Make two cron entry guards fail closed.
- Upgrade vulnerable dependencies within supported release lines.
- Add Operations, entitlement, and cron authorization tests.

## Preserved behavior

- Existing login, Supabase session, tenants, locations, billing, POS, inventory,
  ordering, analytics, email, Anthropic product AI, and customer routes.
- Existing production flags and subscriptions.
- Existing migrations and data.
- No connector, job, email, vendor order, billing, or model call was invoked.

## Compatibility boundaries

- Operations flags default off; the new route cannot expose data without the
  owner API guard.
- No existing table or column is changed.
- The new migration needs no backfill.
- The cron change affects only a misconfigured deployment without
  `CRON_SECRET`; that state now fails closed.
- Dependency updates passed TypeScript, all available unit tests, targeted
  lint, and the production build.

## Release sequence (not executed)

1. Independent review the branch diff and security results.
2. Rehearse migration in a disposable Supabase project.
3. Verify RLS with two tenants and owner/non-owner accounts.
4. Confirm backup and restore evidence.
5. Deploy a preview with every Operations flag off.
6. Run existing customer smoke tests.
7. Enable only `OPERATIONS_CENTER` and `OPERATIONS_OVERVIEW` in staging.
8. Run access, tenant-isolation, accessibility, and responsive checks.
9. Obtain owner approval for the exact production revision and flag payload.
10. Deploy with flags off; observe; then separately enable read-only overview.

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
