# Pourdex Bar Ops (MVP)

## Prerequisites
- Node.js 20+ (tested with 24.x)
- pnpm
- Docker Desktop
- Supabase CLI (local)

## Local setup
```powershell
cd "C:\Users\mitch\Bar Optimization"

# Start Supabase
C:\Users\mitch\scoop\apps\supabase\current\supabase.exe start

# Install deps
pnpm install

# Start app
pnpm dev
```

## Environment
Copy values from `.env.local` (created by Supabase) or create it manually:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## Feature flags
Flags are read from server env and exposed to client components at runtime via `window.__BAROPS_FLAGS`.

Add to `.env.local`:
```
ENTERPRISE_UI=true
AI_TOP_PANEL=false
GRAPHS_OVERVIEW=false
SUBSCRIPTION_GATING=false
```

## Billing (Stripe)
Existing endpoints:
- `POST /api/billing/checkout` create Stripe Checkout session (subscription + 14-day trial)
- `POST /api/billing/portal` create Stripe Customer Portal session
- `GET /api/billing/status` read billing status from Supabase user metadata
- `POST /api/billing/webhook` Stripe webhook handler

Versioned endpoints (additive):
- `GET /api/v1/billing/entitlement` canonical entitlement status (server-validated)
- `POST /api/v1/billing/create-checkout-session`
- `POST /api/v1/billing/create-portal-session`

Required env vars (do not rename):
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
APP_URL=
```

Webhook setup notes:
- Configure Stripe to send events to `APP_URL/api/billing/webhook`
- This app updates billing state in Supabase `user_metadata.billing` (source of truth for gating)
- Relevant events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Subscription gating
When `SUBSCRIPTION_GATING=true`, users must have entitlement `active` or `trialing` to access protected routes under `src/app/(authed)/*`.

Paywall:
- `/subscribe` shows status and directs to Checkout / Portal

## Seed demo data
```powershell
pnpm seed:demo
```
Demo credentials:
- email: `demo@bar.local`
- password: `Password123!`

## CSV ingestion
Sample CSVs live in `seed/csv/`:
- `orders.csv`
- `order_items.csv`
- `modifiers.csv`
- `voids_comps.csv`

Upload via API:
```powershell
$token = "<access_token>"
$locationId = "<location_id>"

curl -X POST "http://localhost:3000/api/ingest/csv" `
  -H "Authorization: Bearer $token" `
  -F "location_id=$locationId" `
  -F "orders=@seed/csv/orders.csv" `
  -F "order_items=@seed/csv/order_items.csv" `
  -F "modifiers=@seed/csv/modifiers.csv" `
  -F "voids_comps=@seed/csv/voids_comps.csv"
```

Import runs:
- `GET /api/ingest/runs`
- `GET /api/ingest/runs/:id`

## Jobs
```powershell
pnpm job:usage --from=2026-01-10 --to=2026-01-10
pnpm job:variance
pnpm job:forecast --date=2026-01-18
pnpm job:ordering --date=2026-01-18
pnpm job:import
pnpm job:import:node
```

## Tests (minimal)
```powershell
pnpm test:entitlement
```

## App pages
- `/dashboard` - Leak & Variance
- `/inventory` - Quick Count
- `/ingest` - POS CSV ingestion + runs
- `/ordering` - Draft POs + Approve
- `/profit` - Menu Profit Ranking

## Deployment (later)
- Supabase: create project, push migrations, set RLS policies
- Vercel: deploy Next.js app, set env vars

## Cron scheduling (cheapest)
- Use GitHub Actions or Vercel Cron to hit job endpoints
- Example: schedule `/api/jobs/usage`
- Available endpoints:
  - `POST /api/jobs/usage`
  - `POST /api/jobs/forecast`
  - `POST /api/jobs/variance`
  - `POST /api/jobs/ordering`
  - `POST /api/jobs/import`
