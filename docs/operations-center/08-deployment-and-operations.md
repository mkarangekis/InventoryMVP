# Deployment and Operations

## Environments

| Environment | Evidence                              | Status                              |
| ----------- | ------------------------------------- | ----------------------------------- |
| Local       | Supabase config and README            | documented; local ports 54321/54322 |
| Test        | no committed environment              | missing                             |
| Preview     | Vercel likely, not configured in repo | unknown                             |
| Staging     | no committed environment/account      | blocked                             |
| Production  | Vercel/Supabase implied               | identity and authority unknown      |

Unknown targets are denied by default.

## Deployment units

- Next.js/Vercel application
- Supabase database/auth/storage migrations
- Toast SFTP server on a separately operated VPS
- QStash/Redis accounts

No GitHub workflow is committed. The production deployment branch and Vercel
Git integration are unknown.

## Schedules

- `/api/jobs/nightly` at `0 4 * * *`
- `/api/jobs/nightly-check` at `0 8 * * *`

Timezone is UTC by Vercel cron convention, but business/local timezone behavior
is not documented. The handlers may enqueue jobs and send email. Both handlers
fail open when `CRON_SECRET` is absent.

## Operational evidence

- `job_runs`, POS import state, connector last error/import timestamps
- health route returns process time only
- audit logs record selected actions
- no committed metrics exporter, tracing provider, alert routing, paging,
  SLOs, backup report, or restore evidence

## Denied production actions

- `vercel deploy`
- `supabase db push/reset` against any unknown target
- feature flag changes
- live connector activation
- job invocation with unknown database
- live email/webhook/publication
- Stripe writes

## Rollback baseline

Application code: revert the isolated branch/commit and keep the Operations
Center master flag off. Database: new schema work will be additive and
forward-fix by default. External connectors: disabled/mock unless separately
approved.
