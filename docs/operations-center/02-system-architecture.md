# System Architecture

## System context

```mermaid
flowchart LR
  Owner[Bar owner / manager] -->|browser session| Web[Pourdex Next.js app]
  Public[Public visitor] --> Web
  Web -->|Auth + service API| Supabase[Supabase Auth / Postgres / Storage]
  Web -->|Checkout + webhooks| Stripe[Stripe]
  Web -->|product analysis| Anthropic[Anthropic API]
  Web -->|jobs + cache| Upstash[QStash / Redis]
  Web -->|transactional mail| Resend[Resend]
  Web -->|read orders| Square[Square]
  Toast[Toast SFTP] --> SFTP[SFTP helper]
  SFTP -->|private objects + signed webhook| Supabase
  SkyTab[SkyTab email] -->|inbound webhook| Web
  Web -->|tenant webhooks| CustomerEndpoint[Customer endpoints]
```

Evidence: imports, environment references, route handlers, and configuration.
Confidence: confirmed. Impact if wrong: high. Validation: connector health and
platform inventory.

## Containers/processes

```mermaid
flowchart TB
  subgraph Vercel
    Next[Next.js pages + route handlers]
    Cron[Vercel cron triggers]
  end
  subgraph Supabase
    Auth[Auth]
    DB[(PostgreSQL)]
    Storage[(Private POS storage)]
  end
  subgraph Workers
    Q[QStash callbacks]
    Direct[Direct TypeScript jobs]
    SFTP[Toast SFTP Node server]
  end
  Next --> Auth
  Next --> DB
  Next --> Storage
  Cron --> Next
  Next --> Q
  Q --> Next
  Direct --> DB
  SFTP --> Storage
  SFTP --> Next
```

The application is a modular monolith plus external workers, not a
microservice system.

## Authentication flow

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant S as Supabase Auth
  participant A as Next API
  U->>B: Submit email/password
  B->>S: signInWithPassword
  S-->>B: access + refresh session
  B->>A: Bearer access token
  A->>S: admin.auth.getUser(token)
  S-->>A: authenticated user
  A->>A: resolve user_profiles + user_locations
  A-->>B: tenant/location scoped data
```

The authenticated page shell itself is client-enforced. API routes generally
authenticate server-side.

## Representative write path: inventory count

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as POST /api/inventory/snapshot
  participant S as Supabase
  participant P as PostgreSQL
  B->>A: token, location, date, lines
  A->>S: validate token/profile/location
  A->>S: insert snapshot
  A->>S: insert snapshot lines
  A->>S: insert audit log
  A->>P: calculate/write reconciliation adjustments
  A-->>B: snapshot id
```

The snapshot and lines are not wrapped in a single transaction; a line insert
failure can leave an orphaned header. This is a pre-existing reliability risk.

## Background-job path

```mermaid
sequenceDiagram
  participant V as Vercel Cron
  participant N as /api/jobs/nightly
  participant Q as QStash
  participant R as /api/jobs/run
  participant D as PostgreSQL
  V->>N: GET with cron authorization
  N->>Q: publish per-location jobs
  Q->>R: signed POST
  R->>D: execute forecast/variance/ordering
  R->>D: persist job result
```

Direct scripts under `jobs/` bypass QStash and connect to `DATABASE_URL`.

## Deployment topology

```mermaid
flowchart LR
  GitHub[GitHub origin/main] -. deployment integration unknown .-> Vercel[Vercel project unknown]
  Vercel --> SupabaseProject[Supabase project unknown]
  Vercel --> StripeAccount[Stripe account unknown]
  Vercel --> UpstashAccount[Upstash account unknown]
  Vercel --> ResendAccount[Resend account unknown]
  VPS[Toast SFTP VPS unknown] --> SupabaseProject
```

Dashed/unknown edges are inference only. No production account, branch, region,
or project id is committed. Impact if wrong: high. Validation requires owner
platform review.
