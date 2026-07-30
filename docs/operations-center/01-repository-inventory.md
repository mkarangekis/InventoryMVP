# Repository Inventory

## Inventory summary

| Surface         | Evidence                                  | Result                                                  | Confidence | Impact if wrong / validation |
| --------------- | ----------------------------------------- | ------------------------------------------------------- | ---------- | ---------------------------- |
| Repository      | `git ls-files`                            | 207 tracked files at base revision                      | confirmed  | Low; repeat command          |
| Language        | `package.json`, `tsconfig.json`           | TypeScript/JavaScript/SQL/CSS                           | confirmed  | Medium; build                |
| Runtime         | `package.json`, baseline                  | Node 20+ documented; Node 24.12 used; Next 16.1.3       | confirmed  | High; CI/runtime review      |
| UI              | `src/app`, `src/components`               | React 19.2.3, App Router, Tailwind 4, custom CSS tokens | confirmed  | Medium; build                |
| Package manager | `pnpm-lock.yaml`                          | pnpm 11.5.2 used; one workspace package                 | confirmed  | Medium; frozen install in CI |
| Data            | `supabase/migrations`, `src/lib/db.ts`    | PostgreSQL/Supabase plus Drizzle query layer            | confirmed  | High; schema compare         |
| Auth            | Supabase clients/routes                   | Supabase password/session Auth                          | confirmed  | High; auth tests             |
| Hosting         | `README.md`, `vercel.json`                | Vercel intended; live project unknown                   | high       | High; platform review        |
| Jobs            | `vercel.json`, `src/app/api/jobs`, `jobs` | Vercel cron, QStash, direct scripts                     | confirmed  | High; sandbox replay         |
| Tests           | `scripts/tests/entitlement.test.ts`       | One bespoke entitlement unit script                     | confirmed  | High; add coverage           |

## Applications and process boundaries

- Next.js web application and API route handlers: `src/app/**`
- Direct PostgreSQL batch jobs: `jobs/**`
- Toast SFTP ingestion server: `scripts/sftp-server/**`
- Supabase Auth/Postgres/Storage: `supabase/**`
- Synthetic public and authenticated demo fixtures: `src/lib/demo.ts`

## Page and API surfaces

- 20 page files
- 65 API route files
- 78 generated application routes in the baseline build
- 16 SQL migration files containing 36 table creation statements and 66 policy
  creation statements

Evidence: baseline build and repository counts. Confidence: confirmed. Impact
if wrong: low; repeat commands.

## Build and quality tooling

- `next build`
- TypeScript strict/noEmit
- ESLint 9 with Next Core Web Vitals and TypeScript presets
- Prettier 3.8
- Drizzle Kit generate/push
- No integrated unit runner, E2E runner, coverage tool, accessibility runner,
  visual regression runner, or CI workflow is committed

## Feature flags

Existing flags:

- `ENTERPRISE_UI` (defaults on)
- `AI_TOP_PANEL`
- `GRAPHS_OVERVIEW`
- `SUBSCRIPTION_GATING`
- Product-AI master/per-feature flags in `src/config/aiFlags.ts`

Flags are serialized into `window.__BAROPS_FLAGS` by `src/app/layout.tsx`.
Operations Center flags must extend this native mechanism while keeping
security decisions server-side.

## Third-party and external systems

| Category           | System               | Mode found           | Evidence                                 |
| ------------------ | -------------------- | -------------------- | ---------------------------------------- |
| Auth/data/storage  | Supabase             | active-capable       | Supabase clients/migrations              |
| Billing            | Stripe               | read/write/webhook   | billing routes                           |
| Product AI         | Anthropic            | read/analysis        | `src/ai/client.ts`, AI routes            |
| Durable jobs/cache | Upstash QStash/Redis | optional             | `src/lib/qstash.ts`, AI cache/rate limit |
| Email              | Resend               | live-send capable    | `src/lib/email.ts`, PO send              |
| POS                | Toast                | SFTP/storage import  | SFTP server/adapters                     |
| POS                | SkyTab               | inbound email import | ingest route/adapters                    |
| POS                | Square               | OAuth/read           | integration routes/adapters              |
| Forecasting        | Nixtla               | optional             | `jobs/compute-forecast-nixtla.ts`        |
| Weather/geocoding  | Open-Meteo           | unauthenticated read | AI context builder                       |
| Webhooks           | tenant endpoints     | live outbound        | `src/lib/webhooks.ts`                    |
| Animation          | GSAP                 | public/client        | landing components                       |

Landing copy mentions Clover, but no Clover adapter exists. This is a
confirmed repository claim/implementation mismatch; validate the live product
before external use.

## Generated and ignored content

- `.next`, `node_modules`, `.pnpm-store`, `.vercel`, `.env.local`,
  `*.tsbuildinfo`, Supabase temp state, and snippets are untracked/ignored.
- Ignored Supabase snippets and temp files are user-owned and were not changed.
- `.openai/hosting.json` is absent, so no Sites project or deployment action is
  applicable.
