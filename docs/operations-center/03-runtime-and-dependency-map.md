# Runtime and Dependency Map

## Request boundaries

- Public pages are statically generated where possible.
- Authenticated pages are also statically generated and perform session checks
  after hydration.
- API routes authenticate Bearer tokens with the Supabase service client.
- Most tenant scope is reconstructed from `user_profiles` and
  `user_locations`; AI routes share `getUserScope`.
- Long work is split between QStash job handlers and direct database scripts.

Evidence: baseline route table, `src/app/(authed)/layout.tsx`,
`src/ai/context.ts`, `src/app/api/jobs/**`. Confidence: confirmed.

## Dependency flow

```text
UI pages
  -> route handlers
    -> Supabase service client / postgres-js
    -> existing product AI boundary (Anthropic)
    -> QStash / Resend / Stripe / POS adapters / tenant webhooks

Vercel cron
  -> nightly routes
    -> QStash
      -> job runner route
        -> database mutations

Toast SFTP
  -> Supabase private storage
  -> signed ingest callback
  -> import pipeline
```

## Failure/retry behavior

- QStash publishing requests three retries.
- Tenant webhook delivery retries three times in-process; durable recovery is
  incomplete.
- POS imports use unique constraints/upsert patterns for important order ids.
- Job scripts record `job_runs`, but leases, heartbeats, cancellation, and
  dead letters are not implemented consistently.
- AI uses rate limiting, circuit breaking, retries, cache, schema-like
  validators, and deterministic fallbacks.
- Product AI output metadata is logged, but token/cost/grounding provenance is
  incomplete.

## High-churn areas

Git history shows greatest churn in global CSS, landing/login UI, dashboard,
ordering, variance, settings, EnterpriseShell, and billing. Recent history
contains billing provider reversions and a trial implementation revert.

Evidence: `git log --name-only`, recent commit subjects. Confidence:
confirmed. Impact: medium/high for compatibility. Validation: targeted
characterization around auth, shell, billing, and ordering.

No inference about individual or team performance is made from commit volume.
