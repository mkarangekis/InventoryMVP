# Product and User Journeys

## Personas

| Persona                       | Evidence                              | Confidence        | Impact if wrong / validation      |
| ----------------------------- | ------------------------------------- | ----------------- | --------------------------------- |
| Independent bar owner         | Landing copy, owner role, pilot       | high              | High; owner interviews            |
| Bar manager/operator          | Pilot, mobile count copy              | high              | Medium; production role inventory |
| Multi-location owner/operator | Enterprise pricing, location selector | high              | High; customer inventory          |
| Analyst/operator              | Pilot tasks                           | medium            | Medium; role inventory            |
| Internal SaaS owner/admin     | No current implementation             | confirmed absence | High; owner defines access        |

## Journey: acquisition to first value

```text
Owner
  -> Public landing page
  -> Sign up / Stripe trial checkout
  -> Supabase account/session
  -> Create tenant and first location
  -> Connect POS or upload CSV
  -> Seed/map inventory and drink specs
  -> Run/import usage + variance + forecast
  -> See first variance/forecast insight
```

Data: Auth user, billing metadata, tenant/profile/location, POS rows, inventory,
specifications, analytics. Integrations: Supabase, Stripe, POS, optional QStash.
Success state: an evidence-backed variance or ordering recommendation. Failure
states: email/session issues, checkout failure, incomplete onboarding, missing
POS mapping, insufficient snapshots, failed jobs. Existing tests: entitlement
logic only. Telemetry: audit/job/import records; no complete activation event.

## Journey: daily operating review

```text
Owner/manager
  -> Sign in
  -> Select location
  -> Review dashboard variance and forecast
  -> Open variance/profit detail
  -> Choose next action
```

Success: priority risk is understood and acted on. Failure: stale/missing data,
AI unavailable, ambiguous freshness. Existing telemetry is incomplete; UI
cards sometimes display current browser time as "last sync" rather than a
source timestamp.

## Journey: inventory quick count

```text
Manager
  -> Inventory or /count
  -> Load accessible items
  -> Enter remaining ounces
  -> Submit dated snapshot
  -> Record lines and adjustment movements
  -> Recompute downstream variance
```

Preconditions: authenticated session, profile, location access, items. Success:
snapshot id and audit record. Failure: partial header/line writes, invalid
values, database calculation failure. Characterization priority: critical.

## Journey: POS ingestion

```text
Operator/system
  -> CSV upload, Toast SFTP, SkyTab inbound email, or Square pull
  -> Create import run
  -> Parse/map/upsert orders/items/modifiers/voids
  -> Persist raw rows
  -> Complete run
  -> Trigger usage, forecast, and ordering
```

Success: idempotent imported sales and updated health. Failure: body/storage
limits, schema drift, invalid signatures, duplicate/out-of-order data, token
expiry. Existing unique constraints cover core POS ids.

## Journey: ordering

```text
Owner/manager
  -> Generate draft POs
  -> Review vendor and line totals
  -> Approve draft
  -> Print/export or send vendor email
```

Success: approved/sent PO with audit. Failure: stale draft, duplicate send,
missing vendor email, unauthorized role. Existing send is live and requires no
separate approval beyond being authenticated/scoped.

## Journey: billing

```text
User
  -> Checkout session
  -> Stripe events
  -> Supabase user_metadata.billing
  -> entitlement API
  -> optional SubscriptionGuard
```

Success: active/trialing entitlement. Failure: customer lookup, webhook replay,
stale metadata, misconfigured flag. Billing behavior must be preserved.

## Journey: support and cancellation

Support is mailto-based in the public UI; no support system connector exists.
Cancellation is through Stripe Customer Portal. No in-product churn survey or
customer-success workflow exists.

## Activation and value events

Proposed, not yet owner-approved:

- Activation: first completed POS import plus first completed inventory
  snapshot that produces a variance/forecast result.
- First value: first evidence-backed variance, forecast, or reorder
  recommendation reviewed by a user.
- Repeated value: weekly review plus accepted/resolved operating action.

Confidence: medium. Impact if wrong: high. Validation: production event/cohort
analysis and owner/customer interviews.
