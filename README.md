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
