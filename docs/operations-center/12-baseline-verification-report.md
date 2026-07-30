# Baseline Verification Report

Base revision: `35466821fc33d07bd85b4b2d50d2ede50dcbb90e`

Environment: detached credential-free worktree at
`.claude/worktrees/operations-center-baseline`, Windows, Node 24.12.0, pnpm
11.5.2. The build used synthetic localhost-only configuration. No `.env.local`
was present in the runner.

## Results

| Check            | Exact command (tool binary abbreviated) | Exit | Duration | Result                                                |
| ---------------- | --------------------------------------- | ---: | -------: | ----------------------------------------------------- |
| Format           | `prettier --check .`                    |    1 |    12.5s | 171 files reported                                    |
| TypeScript       | `tsc --noEmit`                          |    0 |    14.6s | pass                                                  |
| Entitlement unit | `tsx scripts/tests/entitlement.test.ts` |    0 |     3.1s | `entitlement.test.ts: ok`                             |
| Configured lint  | `next lint`                             |    1 |     2.0s | Next 16 treats `lint` as an invalid project directory |
| Direct ESLint    | `eslint .`                              |    1 |    51.1s | 94 problems: 51 errors, 43 warnings                   |
| Production build | `next build`                            |    0 |    57.2s | compile/type/static generation pass; 78 routes        |
| Dependency audit | `pnpm audit --prod --audit-level=low`   |    1 |     4.1s | 43: 18 high, 20 moderate, 5 low                       |
| Secret history   | `gitleaks git --redact --exit-code 1`   |    0 |     5.7s | 78 commits; no leaks                                  |
| Local HTTP smoke | isolated Next start + fetch             |    0 |     9.4s | public pages 200; protected APIs 401                  |

Build warning: Next inferred the wrong workspace root because another lockfile
exists under `C:\Users\mitch`. This is pre-existing.

## HTTP characterization

| Path                          | Unauthenticated status | Interpretation                               |
| ----------------------------- | ---------------------: | -------------------------------------------- |
| `/`                           |                    200 | public landing                               |
| `/login`                      |                    200 | public login                                 |
| `/demo`                       |                    200 | public synthetic demo                        |
| `/dashboard`                  |               200 HTML | client-side session redirect after hydration |
| `/api/health`                 |                    200 | public liveness                              |
| `/api/locations`              |                    401 | server auth enforced                         |
| `/api/v1/billing/entitlement` |                    401 | server auth enforced                         |
| `/api/v1/audit`               |                    401 | server auth enforced                         |

## Pre-existing failures

- Formatting gate
- Configured lint script
- Direct ESLint
- Dependency audit
- No E2E/accessibility/visual/performance/resilience/migration suite

These failures were captured before runtime implementation and will not be
misreported as regressions.

## Checks intentionally not run

- Direct job/seed commands: load `.env.local` and mutate a database.
- `db:push`, Supabase reset, or migration application: unsafe without a
  disposable target.
- Live Stripe, Supabase, POS, QStash, Redis, Resend, Anthropic, Nixtla,
  webhook, Vercel, or production checks.
- Visual/cross-browser inspection: no interactive browser was available.
- Intrusive security or production tests.

## Characterization gaps to close

1. Owner vs non-owner Operations Center access
2. Tenant/object denial
3. Existing entitlement normalization
4. Existing flag defaults
5. Policy tiers and Tier D denial
6. Exact approval hash/expiry/tamper
7. Emergency pause
8. Bounded list and typed-error behavior
9. Synthetic snapshot/overview response
10. Existing login, onboarding, billing, inventory, ingestion, ordering, and
    webhook contracts at the adapter boundary
