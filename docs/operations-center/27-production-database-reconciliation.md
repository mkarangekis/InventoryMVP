# Production Database Reconciliation

## Outcome

Production remains unchanged. A read-only audit found migration-ledger drift,
and the exact production-shaped repair was completed successfully against a
disposable local Supabase database. The repository now contains a manual,
protected reconciliation workflow that leaves the Operations migration for a
separate approval.

This rehearsal is database evidence, but it is not a Supabase backup-restore
rehearsal and does not replace independent review.

## Read-only production evidence

Project `sbfurrspsnpkaonmufwt` reported seven repository versions absent from
its migration ledger. Object inspection showed:

- migration `20260401000000_ai_upgrade.sql` is logically present;
- the webhook, notification-preference, POS-connection, and POS-idempotency
  migrations are absent;
- the `pos-imports` bucket exists, is private, and has the expected MIME
  allowlist, but its file-size limit is unset;
- the bucket contains zero objects, including zero objects over 100 MB;
- the Operations tables are absent.

Seven completed physical backups are visible. The newest observed backup is
`1239233937`, completed at `2026-07-29T07:46:06.313Z`. Point-in-time recovery
is not enabled. No backup was restored or modified.

## Reconciliation payload

The exact payload is
`scripts/operations/production-migration-reconciliation.json`. Its normalized
SHA-256 is:

```text
aa4f1cb6ea441e886ae889f985dc6f1971d3ea50a6a1eef215aac0fd355bdf58
```

The payload:

1. verifies and marks `20260401000000` applied;
2. plans and applies each genuinely missing historical migration separately;
3. applies `20260422000002_pos_storage_bucket.sql`;
4. applies the idempotent
   `20260422000003_pos_storage_bucket_limits.sql` correction;
5. verifies the historical tables, RLS policies, constraints, indexes, and
   bucket configuration;
6. proves that only `20260729000000_operations_center.sql` remains pending.

The Operations migration is not part of the reconciliation apply.

## Isolated rehearsal

The production state was reproduced in local Supabase/Postgres with synthetic
data:

- the first ten ledger versions were applied;
- the AI objects were applied without their ledger entry;
- the `pos-imports` bucket was created with the production `NULL` size limit;
- the manifest's eight expected pending versions matched exactly.

The rehearsal then passed:

- logical AI object verification;
- exact AI migration-history repair;
- six consecutive single-file dry runs and applies;
- historical table, RLS, policy, index, constraint, and bucket verification;
- a dry run containing only the Operations migration;
- an exact Operations apply;
- all 18 Operations tables and owner-read policies;
- tenant A/tenant B isolation;
- non-owner, missing-grant, and anonymous denial;
- authenticated read-only enforcement;
- service-role access;
- audit update/delete rejection;
- an empty postflight migration plan.

The disposable database container and its volume were stopped and removed.
The older local development Supabase instance was not reset or changed.

## Protected automation

`.github/workflows/operations-database-reconciliation.yml` is manual-only and
shares the `operations-production-database` concurrency group with the
Operations migration workflow. It requires:

- exact `main` revision;
- exact manifest SHA-256;
- reviewed change record;
- backup/restore reference for apply mode;
- protected database URL;
- the exact initial pending-version set;
- exact file hashes;
- a one-file dry run before every one-file apply;
- postflight proof that only the Operations migration remains.

Both database workflows are manual-only so a merge cannot mutate the database.
The GitHub environment must require an independent reviewer, prevent
self-review, and disable administrator bypass before either apply is eligible.

## Remaining production gates

Production reconciliation and Operations activation remain blocked until:

1. the exposed chat credentials are confirmed revoked;
2. an independent reviewer approves the exact revision and payload;
3. backup `1239233937` or a newer backup is restored to an isolated target and
   the restore is verified;
4. the protected GitHub environment is configured with fresh credentials and
   the exact approval variables;
5. the high Sharp advisory is patched by a supported Next release or receives
   explicit, expiring security-risk acceptance;
6. the dedicated owner email and existing tenant UUID are selected.

## Rollback

A failed plan changes nothing. Historical applies are additive; keep all
Operations flags off and use reviewed forward repair for a failed migration.
Do not drop tables or the storage bucket as routine rollback. The application
rollback remains `OPERATIONS_CENTER=false`.
