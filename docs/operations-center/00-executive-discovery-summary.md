# Executive Discovery Summary

Date: 2026-07-29

## What the application is

Pourdex Bar Ops is a multi-tenant bar and restaurant operations SaaS. It
ingests POS data, maps sales to drink specifications, records physical
inventory counts, estimates theoretical usage and variance, forecasts demand,
generates draft purchase orders, and presents profitability and AI-assisted
analysis.

Evidence: `README.md`, `PILOT.md`, `src/app/page.tsx`,
`src/app/(authed)/**`, `src/app/api/**`, and `supabase/migrations/**`.
Confidence: confirmed. Impact if wrong: high. Validation: route build,
repository inventory, migration review, and user-journey reconstruction.

## Who it serves

Primary customer personas are independent bar owners/managers and
multi-location hospitality operators. The code creates new profiles with the
role `owner`; the pilot guide also names manager and analyst/operator tasks,
but only `owner` is currently persisted by repository code and no runtime role
authorization is enforced.

Evidence: `PILOT.md`, `src/app/page.tsx`,
`src/app/api/onboarding/bootstrap/route.ts`, `src/lib/schema.ts`.
Confidence: high. Impact if wrong: high. Validation: owner review and
production role inventory.

## How it makes money

The public site advertises a Single Bar plan at USD 500/month and custom
Enterprise pricing. Signup starts Stripe Checkout with a 14-day trial.
Entitlement is read from Supabase Auth user metadata and only enforced when
`SUBSCRIPTION_GATING=true`.

Evidence: `src/app/page.tsx`, `src/app/login/page.tsx`,
`src/app/api/billing/**`, `src/lib/billing/entitlement.ts`. Confidence:
confirmed for repository behavior; production pricing/account state unknown.
Impact if wrong: high. Validation: owner-approved Stripe price/account review.

## How it is deployed

The application is a Next.js 16.1.3 App Router deployment intended for Vercel,
with Supabase Auth/Postgres/Storage and two Vercel cron routes. QStash is used
for durable job dispatch when configured. A Toast SFTP helper is a separate
Node process intended for a VPS. The production Vercel project, deployment
branch, Supabase project, and regions are not recorded.

Evidence: `package.json`, `vercel.json`, `supabase/config.toml`,
`src/lib/qstash.ts`, `scripts/sftp-server/index.js`, `README.md`. Confidence:
high for topology, unknown for live targets. Impact if wrong: high.
Validation: owner/platform configuration review.

## Critical paths that must not break

1. Signup/sign-in and Supabase session handling
2. Onboarding tenant/location/profile creation
3. Optional subscription entitlement gating
4. POS CSV/Toast/SkyTab/Square ingestion and idempotency
5. Inventory quick count and snapshot creation
6. Usage, variance, forecast, and ordering jobs
7. Draft purchase-order approval and existing vendor email send
8. Tenant/location-scoped dashboards, audit, and AI insights
9. Stripe webhook-driven entitlement metadata

Evidence: route and migration inventory. Confidence: high. Impact if wrong:
high. Validation: characterization tests and synthetic end-to-end runs.

## Where the Operations Center belongs

The native extension point is an `operations` bounded module inside the same
Next.js application, linked from `EnterpriseShell` only after server-verified
permission discovery. It must reuse Supabase Auth and the existing
`user_profiles` tenant/role record. Operations APIs require a central
server-only owner permission guard; client-only routing is insufficient.

Evidence: `src/app/(authed)/layout.tsx`,
`src/components/enterprise/EnterpriseShell.tsx`, `src/ai/context.ts`,
`src/lib/schema.ts`. Confidence: high. Impact if wrong: high. Validation:
authorization matrix and negative tests.

## Native patterns to preserve

- Next.js App Router route handlers and pages
- TypeScript, React 19, Tailwind/CSS-token design system
- Supabase Auth, service adapter, Postgres, migrations, and tenant/location keys
- Existing feature-flag runtime exposure
- QStash-compatible durable jobs
- Existing Anthropic-backed product AI behavior
- Stripe/Supabase entitlement behavior

New Operations Center reasoning will use a separate server-only OpenAI
provider abstraction in disabled/mock mode by default. It will not migrate or
replace existing product AI.

## Highest risks

- No role-based authorization exists; all authenticated roles can reach all
  current authenticated features for their locations.
- Authenticated pages return HTML before a client-side session redirect.
- Cron routes fail open when `CRON_SECRET` is absent.
- Square OAuth state is unsigned and callback location ownership is not
  revalidated.
- POS credentials/tokens and webhook secrets are stored as readable columns.
- Audit records can be inserted and are not append-only protected.
- Dependency audit reports 43 advisories, including 18 high.
- Lint and formatting gates already fail.
- Public marketing contains numerical outcome claims without a repository
  claims manifest or evidence.

See `13-risk-register.md`.

## Highest-value first slice

Implement a disabled-by-default, owner-only Operations Center foundation:

1. Central owner permission guard and authorization tests
2. Master/per-module flags and explicit environment state
3. Read-only overview using repository-backed synthetic snapshot data
4. Deterministic Tier A–D policy and exact-payload approvals
5. Append-only application audit contract
6. Emergency pause
7. Mock/disabled agents and connectors with honest health states

This slice is additive and does not require changing billing, customer data,
existing AI, or existing operator workflows.

## Discovery gate

| Gate                                            | Result                                   | Evidence                                    |
| ----------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Active instructions recorded                    | pass                                     | `evidence/phase-0-preflight.md`             |
| Architecture/deployment diagrams                | pass                                     | `02-system-architecture.md`                 |
| Core journeys mapped                            | pass                                     | `06-product-and-user-journeys.md`           |
| Auth/authorization/tenant boundaries understood | pass with risks                          | `05-authentication-and-authorization.md`    |
| Billing/entitlements understood                 | pass                                     | `07-business-model-and-value-drivers.md`    |
| Existing admin routes/roles located             | pass: no admin route; owner role located | `05-authentication-and-authorization.md`    |
| Baseline run or blockers documented             | pass                                     | `12-baseline-verification-report.md`        |
| Production boundaries identified                | pass with live targets unknown/denied    | `08-deployment-and-operations.md`           |
| Risk register exists                            | pass                                     | `13-risk-register.md`                       |
| Exact extension points named                    | pass                                     | `15-operations-center-integration-plan.md`  |
| Characterization gaps listed                    | pass                                     | `12-baseline-verification-report.md`        |
| No rewrite required                             | pass                                     | `decisions/0001-native-modular-monolith.md` |

Discovery gate result: **passed for additive local implementation**.
Production data, deployment, connector activation, and customer-visible
enablement remain blocked pending their own gates.
