# Security and Privacy Threat Model

## Scope and assets

Assets include source code, tenant/location business data, POS transactions,
inventory/profit data, user/vendor contact data, billing metadata, connector
credentials, generated artifacts, approvals, audit history, and deployment
authority.

## Threats

| Threat                           | Entry/precondition               | Impact   | Existing / planned controls                        | Residual risk       | Test / owner            |
| -------------------------------- | -------------------------------- | -------- | -------------------------------------------------- | ------------------- | ----------------------- |
| Cross-tenant evidence leak       | service-role query omits scope   | critical | tenant keys; central ops guard; negative tests     | medium              | auth/tenant suite       |
| Client-only admin protection     | hidden route/nav                 | critical | server API permission and guarded page bootstrap   | low                 | unauth UI/API tests     |
| Approval confused deputy         | payload changes                  | critical | canonical hash, expiry, target/environment binding | low                 | tamper tests            |
| Agent self-authorization         | model output used as policy      | critical | deterministic policy; immutable definitions        | low                 | Tier D/self-edit tests  |
| Prompt injection                 | repo/ticket/content input        | high     | untrusted delimiters, schemas, no executor tools   | medium              | adversarial evals       |
| Secret leakage                   | logs/prompts/artifacts           | critical | opaque refs, redaction, allowlist logging          | medium              | gitleaks + fixtures     |
| Runner reaches production        | inherited env/network            | critical | detached workspace, denylist, synthetic config     | medium              | runner denial tests     |
| Cost exhaustion                  | schedules/model loops            | high     | budget/timeout/lease/pause                         | low                 | budget/resilience tests |
| Audit alteration                 | normal role writes/updates       | high     | append-only API/DB controls                        | medium              | immutability tests      |
| Cron unauthenticated             | secret missing                   | critical | pre-existing fail-open; planned fail-closed fix    | high until fixed    | route tests             |
| OAuth state tamper               | unsigned Square state            | high     | pre-existing; signed state/revalidation proposal   | high until fixed    | callback tests          |
| Plaintext connector secret       | readable DB columns              | critical | ops uses secret refs; existing migration proposal  | high until migrated | schema review           |
| SSRF via tenant webhook          | arbitrary URL                    | high     | pre-existing egress gap; planned URL policy        | high                | SSRF fixtures           |
| Duplicate billing webhook        | replay                           | high     | signature only; event-id ledger proposal           | medium/high         | replay test             |
| Partial inventory write          | multi-step nontransactional path | medium   | current checks; transaction proposal               | medium              | fault injection         |
| Public unsupported claims        | landing/content drafts           | high     | claims registry and approval                       | medium              | claim-source tests      |
| Synthetic demo mistaken for real | demo fixture                     | medium   | explicit synthetic labels/provenance               | low                 | E2E/copy test           |

## Privacy inventory

| Data class            | Purpose            | Access/model use                             | Retention/deletion              |
| --------------------- | ------------------ | -------------------------------------------- | ------------------------------- |
| Auth identity/email   | account/session    | server + scoped UI; not model by default     | Supabase/account policy unknown |
| POS/order data        | analytics/forecast | tenant scoped; minimized aggregate for model | contract/retention unknown      |
| Inventory/spec/cost   | operations         | tenant scoped; aggregate model context       | business retention unknown      |
| Vendor contact        | ordering           | scoped; never agent-send by default          | business retention unknown      |
| Billing metadata      | entitlement        | server only; excluded from model             | Stripe/Supabase policy          |
| Connector credentials | integration        | executor only; never model                   | revoke/rotate required          |
| Agent traces          | provenance         | privileged admins                            | proposed bounded retention      |
| Audit/approval        | accountability     | privileged admins                            | long-lived/append-only          |

Lawful basis, residency, subprocessors, contractual retention, and deletion
timelines require owner/legal validation and are not invented.

## Baseline security scan

- `gitleaks git --redact`: pass, 78 commits, no leaks.
- `pnpm audit --prod`: fail, 43 advisories (18 high, 20 moderate, 5 low).
- Intrusive production testing: not performed.
