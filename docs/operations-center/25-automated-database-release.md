# Automated Database Release

## Outcome

Vercel already deploys a successful merge to the configured production branch.
Database migrations are a separate release action. The repository now provides
`.github/workflows/operations-database-release.yml` to plan or apply one exact
approved Supabase migration without using a Vercel token, GitHub personal
access token, Supabase management token, seed command, database reset, or
direct dashboard SQL.

The workflow does not enable Operations Center flags or grant an administrator.
Those remain separate approvals after database and access verification.

## Required GitHub environment

Create a GitHub environment named `operations-production` with:

- production branch restricted to `main`;
- at least one independent required reviewer;
- prevent self-review enabled;
- administrator bypass disabled;
- one environment secret, `SUPABASE_DB_URL`, containing the percent-encoded
  direct or session-pooler Postgres URL from Supabase **Connect**;
- the environment variables below.

| Environment variable        | Required value for this migration                                                      |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `APPROVED_RELEASE_SHA`      | Exact 40-character `main` commit that the workflow will release                        |
| `APPROVED_MIGRATION_FILE`   | `20260729000000_operations_center.sql`                                                 |
| `APPROVED_MIGRATION_SHA256` | `f3121638eaf9e92dd79f941123b95a6d8fa39b5648c32309c8c6d8eff24d828d`                     |
| `APPROVED_BACKUP_REFERENCE` | Owner-verified backup/restore rehearsal identifier; never a password or connection URL |
| `APPROVED_CHANGE_RECORD`    | Reviewed PR/change record URL or immutable identifier                                  |

Do not reuse any credential sent through chat. Revoke exposed credentials
before configuring the environment. GitHub encrypts environment secrets and
does not expose them to the job until the environment's protection rules pass.

## Protected manual behavior

The workflow is manual-only. A merge never starts a database apply. An
authorized operator selects `plan` or `apply` through `workflow_dispatch`, and
the job cannot receive the database secret until the `operations-production`
reviewer approves it. After approval it:

1. requires the event revision to match `APPROVED_RELEASE_SHA`;
2. requires the exact migration filename and SHA-256;
3. requires a reviewed change record and backup reference;
4. runs entitlement, Operations, cron-auth, TypeScript, and production-build
   checks;
5. runs `supabase migration list` and `supabase db push --dry-run`;
6. refuses multiple or different pending migrations;
7. uploads the read-only plan;
8. applies without seeds only in `apply` mode;
9. verifies all 18 tables, RLS owner policies, authorization function, and
   immutable-audit trigger;
10. confirms the migration is no longer pending.

The separate
`.github/workflows/operations-database-reconciliation.yml` must run first for
the currently observed production drift. Its exact payload and rehearsal
evidence are recorded in `27-production-database-reconciliation.md`. It repairs
and applies only the reviewed historical set, then proves this workflow will
see exactly one pending Operations migration.

## First release

Before approving the first production job:

1. revoke the credentials exposed in conversation;
2. review the successful local production-shaped rehearsal, then restore a
   current Supabase backup to an isolated branch/project and verify it;
3. record the backup/restore reference and independent review;
4. set `APPROVED_RELEASE_SHA` to the exact follow-up merge commit;
5. run and approve the protected reconciliation plan/apply first;
6. inspect this workflow's checks and waiting environment deployment;
7. approve only if the migration plan contains exactly
   `20260729000000_operations_center.sql`.

After application, leave these Vercel production values in their safe state
until authenticated access and tenant-isolation QA pass:

```text
OPERATIONS_CENTER=false
OPERATIONS_OVERVIEW=false
OPERATIONS_APPROVALS=false
OPERATIONS_AGENTS=false
OPERATIONS_CONNECTORS=false
OPERATIONS_EXECUTION=false
OPERATIONS_EMERGENCY_PAUSE=true
OPERATIONS_AI_MODE=disabled
OPERATIONS_ENVIRONMENT=production
```

Feature activation requires a separate reviewed Vercel environment change and
redeployment. The first activation payload may set only
`OPERATIONS_CENTER=true` and `OPERATIONS_OVERVIEW=true`; execution, agents,
approvals, connectors, and AI remain disabled.

## Failure and rollback

- A failed plan or validation applies nothing.
- A failed migration keeps feature flags off and invokes the failed-migration
  runbook.
- The schema is additive, so rollback normally disables the feature and uses a
  reviewed forward repair. Do not drop Operations tables as routine rollback.
- Remove the GitHub environment secret after the release window. If a
  temporary migration role was used, revoke it. Do not rotate a shared
  production database password until every dependent Vercel/job secret is
  inventoried and updated in one reviewed change.
