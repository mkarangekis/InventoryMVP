# Risk Register

Scale: likelihood and impact are low/medium/high/critical. Scores are
qualitative until the owner accepts weights.

| ID  | Category      | Risk                                                 | Likelihood | Impact   | Existing/planned controls                             | Residual           | Owner / next review     | Evidence                |
| --- | ------------- | ---------------------------------------------------- | ---------- | -------- | ----------------------------------------------------- | ------------------ | ----------------------- | ----------------------- |
| R1  | Security      | No role enforcement for current privileged workflows | high       | high     | ops owner guard; propose scoped existing fixes        | high               | owner / pre-launch      | auth scan               |
| R2  | Security      | Cron endpoints fail open without secret              | medium     | critical | fail-closed characterization/fix                      | high               | engineering / immediate | nightly routes          |
| R3  | Security      | Square OAuth state tampering/location substitution   | medium     | high     | signed state and ownership recheck proposal           | high               | engineering / immediate | Square routes           |
| R4  | Privacy       | POS/webhook connector secrets stored readable        | high       | critical | opaque refs for ops; migration proposal               | high               | owner/security          | migrations              |
| R5  | Supply chain  | 43 dependency advisories                             | high       | high     | scoped updates and full tests                         | medium             | engineering / immediate | pnpm audit              |
| R6  | Reliability   | Only one unit script; no CI                          | high       | high     | add native tests/CI proposal                          | medium             | engineering             | package/.github absence |
| R7  | Quality       | Lint/format gates fail before work                   | high       | medium   | scope lint to new code; cleanup backlog               | medium             | engineering             | baseline                |
| R8  | Data          | Service-role queries rely on duplicated scope logic  | medium     | critical | central ops guard/repository                          | low for ops        | engineering/security    | API scan                |
| R9  | Data          | Inventory snapshot writes are nontransactional       | medium     | high     | characterization + transactional improvement proposal | medium             | engineering             | snapshot route          |
| R10 | Billing       | Stripe webhook replay/idempotency gap                | medium     | high     | provider event ledger proposal                        | medium             | owner/engineering       | billing webhook         |
| R11 | Product       | Activation/value events undefined                    | high       | high     | proposed definitions; owner validation                | medium             | product owner           | journey map             |
| R12 | Claims        | Unsupported numerical public claims                  | high       | high     | claims registry/draft-only workflow                   | medium             | owner/marketing/legal   | landing                 |
| R13 | Operations    | No backup/restore evidence or runbooks               | unknown    | critical | runbooks; owner platform evidence                     | high               | platform owner          | repo absence            |
| R14 | Deployment    | Production targets/branch unknown                    | high       | critical | deny unknown; owner inventory                         | low while disabled | platform owner          | preflight               |
| R15 | Cost          | No AI/external cost attribution/caps                 | medium     | high     | ops budgets and mock default                          | low for ops        | owner                   | AI implementation       |
| R16 | Audit         | Existing audit table not append-only                 | medium     | high     | ops immutability policy/migration                     | medium             | security                | migration               |
| R17 | Demo          | README demo identity differs from code               | high       | medium   | docs alignment; synthetic labels                      | low                | product                 | README/demo.ts          |
| R18 | Marketing     | Landing says Clover but no adapter exists            | high       | high     | claims review; no republish                           | medium             | owner/marketing         | landing/inventory       |
| R19 | Performance   | Global authenticated shell/client bundle grows       | medium     | medium   | lazy Operations Center route/module                   | low                | engineering             | App Router              |
| R20 | Legal/privacy | Retention/lawful basis/residency unknown             | unknown    | high     | governance doc; owner/legal action                    | high               | owner/legal             | repo absence            |

No risk is accepted on the owner's behalf. High/critical disposition is a
production gate.
