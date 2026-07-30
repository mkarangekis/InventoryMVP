# Operations Center Schema Catalog

The durable contract is the unapplied additive migration
`supabase/migrations/20260729000000_operations_center.sql`. Application domain
contracts live in `src/operations/domain`.

| Entity                       | Durable table / type                | Safety invariant                                                 |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Workspace                    | `ops_workspaces`                    | execution false and pause true by default                        |
| Policy version               | `ops_policy_versions`               | content hash and creator retained                                |
| Evidence reference           | `ops_evidence_references`           | source, observation time, freshness, confidence, synthetic label |
| Signal                       | `ops_signals`                       | bounded severity/status and evidence IDs                         |
| Opportunity                  | `ops_opportunities`                 | component scores and scoring version                             |
| Work item / task             | `ops_work_items`, `ops_tasks`       | acceptance, verification, rollback, lease, idempotency           |
| Agent definition             | `ops_agent_definitions`             | immutable version, provider, schema, budget                      |
| Agent run                    | `ops_agent_runs`                    | definition, hashes, model, prompt, tokens, cost, timing          |
| Artifact                     | `ops_artifacts`                     | content hash, classification, retention                          |
| Approval                     | `ops_approval_requests`             | exact payload hash, expiry, separate approver                    |
| Connector                    | `ops_connector_installations`       | scoped mode; encrypted credential bytes only                     |
| Schedule / dead letter       | `ops_schedules`, `ops_dead_letters` | disabled default, lease, retry evidence                          |
| Metric / health / experiment | three `ops_*` tables                | definitions, denominators, cohorts, evidence                     |
| Audit event                  | `ops_audit_events`                  | hash chain plus database mutation-rejection trigger              |

All Operations tables:

- are additive and tenant-keyed;
- have RLS enabled;
- grant authenticated users only owner-scoped read access;
- require the service role for writes;
- contain no plaintext credential column; and
- remain inert while feature flags are off.

The migration has not been applied to any database. SQL execution, RLS
integration tests, and rollback rehearsal require a disposable/staging Supabase
project.
