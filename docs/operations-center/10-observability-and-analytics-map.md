# Observability and Analytics Map

## Existing operational signals

- `job_runs`: job start/completion/failure
- `pos_import_runs`: ingestion status/error/freshness
- `pos_connections`: last import/file/error
- `audit_logs`: selected user/system/AI actions
- `ai_insight_feedback`: thumbs feedback
- `webhook_deliveries`: delivery status/response
- server `console` logs
- `/api/health`: process liveness and time

No application tracing backend, structured logging schema, SLO, routed alert,
coverage trend, deployment telemetry, or cost ledger is committed.

## Existing product analytics

- POS revenue/order rows
- theoretical usage
- variance flags and baselines
- demand forecasts
- menu profitability
- inventory snapshot history

Dashboards compute analytics directly from operational tables. There is no
separate event catalog or canonical metric registry.

## Candidate canonical metrics

| Key                            | Definition status | Source                     | Limitation                        |
| ------------------------------ | ----------------- | -------------------------- | --------------------------------- |
| `pos_revenue`                  | partial           | closed `pos_orders.total`  | timezone/currency not explicit    |
| `variance_oz`                  | partial           | `variance_flags`           | sign/absolute presentation varies |
| `variance_cost`                | inferred          | variance × ingredient cost | not canonical                     |
| `forecast_usage_oz`            | confirmed field   | demand forecast            | accuracy metric absent            |
| `inventory_snapshot_completed` | event-like        | snapshot + lines           | transaction completeness risk     |
| `first_value`                  | proposed          | import + count + insight   | owner validation required         |
| `po_approved`                  | event-like        | status/audit               | role policy absent                |

## Data-quality gaps

- Freshness UI is inconsistent.
- Currency is implied USD, not persisted per tenant.
- Timezone exists per location but analytics queries often use server/UTC.
- Demo and production-like data are code-separated but event contamination
  controls are absent.
- No schema-versioned analytics events.
- No automated duplicate/late-arrival/identity checks beyond selected unique
  constraints.
