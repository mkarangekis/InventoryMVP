# Phase 0 Preflight Evidence

Captured: 2026-07-29 (America/New_York)

## Repository and instruction scope

- Repository root: `C:\Users\mitch\Bar Optimization`
- Master specification:
  `C:\Users\mitch\Downloads\SaaS_Operations_Center_Codex_Master_MetaPrompt.md`
  (160,994 bytes; 7,127 lines; read completely before action)
- Active repository guidance:
  - `README.md` — local setup, environment names, feature flags, billing,
    subscription gating, seed data, CSV ingestion, jobs, routes, and deployment
    notes
  - `PILOT.md` — pilot workflow, setup, roles, and common operator issues
  - `package.json` and lock/workspace files — native commands, dependencies,
    package manager, and install-script allowlist
  - `.env.example` — configuration names and safe defaults
  - `.gitignore`, TypeScript, ESLint, Prettier, Next.js, Drizzle, Vercel, and
    Supabase configuration — native build/deployment/data conventions
- Not present:
  - `AGENTS.md` or `AGENTS.override.md`
  - `CONTRIBUTING*`
  - `SECURITY*`
  - architecture/ADR documentation
  - `.github` workflows or CODEOWNERS
  - `.openai/hosting.json`
  - deployment or incident runbooks

No instruction conflict has been found. The master specification's safer
control applies where the repository is silent.

## Initial Git safety record

- Initial branch/upstream: `main` / `origin/main`
- Initial HEAD: `35466821fc33d07bd85b4b2d50d2ede50dcbb90e`
- Initial working tree: clean
- Stashes: none
- Submodules: none
- Existing worktrees: root worktree only
- Recent release tags: none
- Remote: `origin` points to the GitHub `InventoryMVP` repository
- Dedicated implementation branch created: `codex/operations-center`

No reset, force push, history rewrite, merge, deployment, or destructive file
operation occurred.

## Dependency and secret preflight

- Package manager: pnpm with a committed `pnpm-lock.yaml`.
- Existing dependencies are already present in `node_modules`.
- Package configuration allows the `esbuild` lifecycle build and explicitly
  ignores listed workspace build dependencies; dependency installation is not
  required for the first baseline.
- `.env.local` exists and is ignored. Its values were not printed.
- Only variable names were inspected. They include Supabase, Stripe, job,
  Square/Toast, and Vercel identity configuration, so local commands must be
  assumed capable of reaching external or production-like services until each
  call path is inspected.
- `.env.example` defaults all AI features off and contains no secret values.
- Baseline commands will use a sanitized process environment or static checks
  until test and build reachability are proven.

Source-level environment behavior is now confirmed:

- Next.js commands automatically load the ignored `.env.local`.
- Standalone jobs under `jobs/` explicitly parse the root `.env.local` and
  prefer its `DATABASE_URL` over the process environment. They immediately
  connect and write `job_runs` and domain records; they are denied for the
  baseline.
- `scripts/seed-demo.mjs` loads `.env.local`, creates an Auth user, and inserts
  product data; it is denied outside an explicitly local synthetic database.
- `db:push`, all job scripts, seed scripts, and POS import scripts are
  classified as mutating.
- TypeScript, formatting, and the entitlement unit script do not need a
  database or external credential and can run with sanitized configuration.
- A detached worktree without `.env.local` will be used for baseline build
  reproduction so ignored credentials cannot be loaded.

## Initial production boundary

Confirmed:

- Vercel configuration schedules `/api/jobs/nightly` and
  `/api/jobs/nightly-check`.
- The README describes Vercel deployment and Supabase migrations but does not
  identify the production project, region, database, or deployment branch.
- Billing paths use Stripe and store entitlement state in Supabase user
  metadata.
- Local `.env.local` includes real-looking provider variable names and is
  therefore treated as sensitive and potentially live.
- Direct job scripts can mutate every tenant when optional tenant/location
  arguments are omitted.
- Nightly Vercel cron handlers enumerate active locations, enqueue QStash
  jobs, and may send Resend email. They are denied in automated local work.
- Stripe checkout/portal/webhook paths can create external billing objects or
  mutate entitlement metadata. They are denied.
- POS integration paths can exchange Square OAuth tokens, ingest Toast/SkyTab
  data, and store provider credentials. They are denied.
- Purchase-order sending and notification helpers can send live email. They
  are denied.
- Registered webhooks can send outbound HTTP requests. They are denied.
- The existing cron routes authorize only when `CRON_SECRET` is configured;
  the absence of that value is fail-open. This is a pre-existing security risk
  to preserve as baseline evidence and address through an explicit,
  tested change.

Unknown and denied by default:

- Production Vercel project and branch
- Production Supabase project/database
- Production Stripe account and mode
- Square/Toast environment identity
- Production feature-flag state
- Live email or other outbound provider configuration
- Commands authorized to mutate production

Automated work will not use unknown targets. No production or external write is
authorized.

## Gate statement

Phase 0 passes.

The active instructions, Git state, environment loading, production-unknown
targets, mutating commands, and external side effects have been identified.
The default runner denylist is:

```text
pnpm db:push
pnpm seed:demo
pnpm seed:forecast
pnpm job:*
supabase db push/reset
vercel deploy
all production feature-flag changes
all live connector, billing, email, webhook, and publication actions
```

No destructive or production mutation occurred.
