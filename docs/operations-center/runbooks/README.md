# Operations Center Runbooks

These runbooks are drafts for an unconnected control plane. Production contact
routes and platform identifiers are blockers in `../BLOCKERS.md`. Every
response starts by preserving evidence and avoiding production mutation beyond
the minimum approved containment action.

## Universal response sequence

1. Identify the exact environment, tenant scope, revision, and reporter.
2. Activate the narrowest safe containment; use the emergency pause for any
   uncertain Operations execution.
3. Preserve timestamps, request IDs, audit hashes, and redacted logs.
4. Do not paste credentials, customer payloads, or tokens into tickets/chat.
5. Assign an incident owner and severity.
6. Verify recovery with negative as well as positive tests.
7. Record the decision, evidence, approval, and rollback.

## Emergency pause

- **Detect:** unexpected write, approval anomaly, scope uncertainty, budget
  breach, or connector compromise.
- **Contain:** set `OPERATIONS_EMERGENCY_PAUSE=true` and
  `OPERATIONS_EXECUTION=false`; if uncertain, disable `OPERATIONS_CENTER`.
- **Verify:** Tier B/C policy tests deny; APIs remain owner-only; existing
  customer routes still pass smoke tests.
- **Recover:** resolve cause, rotate affected credentials, independent review,
  then approve the exact unpause payload. Never let a model unpause itself.

## Connector compromise or revocation

- **Detect:** unauthorized scope, token use, provider alert, or unexpected
  connector output.
- **Contain:** pause execution, revoke at provider, mark installation revoked,
  and rotate the application secret in the secure secrets system.
- **Evidence:** connector ID/scopes, provider request IDs, first/last observed,
  audit chain, affected tenants; never record the token.
- **Recover:** reconnect with least privilege in staging, verify read-only
  behavior, then obtain owner scope approval.

## Access compromise or cross-tenant suspicion

- **Detect:** owner denial anomaly, tenant mismatch, foreign record, or unusual
  service-role access.
- **Contain:** disable Operations Center, revoke suspected sessions/service
  keys, and preserve access logs. Escalate as critical.
- **Diagnose:** compare authenticated user, profile tenant, requested resource,
  RLS decision, API decision, and audit event.
- **Recover:** rotate keys, patch server and RLS guards, run two-tenant negative
  tests, and obtain independent security review before re-enable.

## Prompt injection or ungrounded model output

- **Detect:** evidence text attempts to issue instructions, unknown evidence
  IDs, schema failure, permission language, or unsupported claim.
- **Contain:** disable agent/model mode; quarantine run and artifact; do not
  turn output into work or an external action.
- **Diagnose:** retain redacted input hash, agent/prompt/schema version, model,
  response ID, output hash, validator result, and allowed evidence IDs.
- **Recover:** add the case to evals, tighten envelope/schema, pass injection
  and citation tests, and require reviewer acceptance.

## Model outage, latency, or cost spike

- **Detect:** timeout/retry rates, circuit opening, budget threshold, or
  provider incident.
- **Contain:** switch `OPERATIONS_AI_MODE=disabled`; do not silently fall back
  to a more expensive model.
- **Recover:** validate provider health, cost and token attribution, bounded
  retries, and schema pass rate in staging before resuming. Model calls remain
  nonessential to customer workflows.

## Queue, schedule, lease, or dead-letter failure

- **Detect:** expired lease, repeated idempotency key, missed schedule, max
  attempts, or dead-letter record.
- **Contain:** pause the affected schedule; never replay blindly.
- **Diagnose:** inspect task, lease owner/expiry, attempts, idempotency key,
  agent run, and downstream side-effect record.
- **Recover:** prove the action did not already occur, correct the cause, and
  replay one exact item with a new approved recovery record.

## Failed release or migration

- **Detect:** build/smoke failure, authorization regression, elevated errors,
  RLS mismatch, or customer workflow regression.
- **Contain:** disable `OPERATIONS_CENTER`; halt flag/migration progression.
- **Application rollback:** restore the prior reviewed revision through the
  deployment platform.
- **Database rollback:** prefer forward correction because the migration is
  additive. Do not drop tables without backup, retention review, and owner
  approval.
- **Verify:** login, billing, dashboard, ingestion, inventory, ordering, jobs,
  and owner/non-owner Operations access.

## Stale or contradictory evidence

- **Detect:** freshness threshold exceeded, source missing, test invalidated, or
  two sources disagree.
- **Contain:** label stale/unknown; remove the item from automated ranking and
  prevent outcome-learning updates.
- **Recover:** reacquire from the source, record observation time and hash,
  resolve contradiction, then recompute with the same scoring version or
  explicitly version the change.

## Billing, pricing, or financial anomaly

- **Detect:** unexpected Stripe state, plan/price mismatch, duplicate event,
  spend threshold, or unapproved purchase.
- **Contain:** Operations Center may surface the event but must not refund,
  charge, change price, or buy. Pause related workflow and route to owner.
- **Recover:** reconcile provider IDs and webhook evidence, require finance
  authority for the exact action, verify in provider, and record rollback.

## Email, social, public claim, or deliverability incident

- **Detect:** unapproved send/post, complaint, bounce spike, unsupported claim,
  consent issue, or public error.
- **Contain:** stop the campaign/workflow at the provider, pause connector, and
  preserve artifact/version/audience/approval.
- **Recover:** legal/brand review, claim-source verification, suppression and
  consent validation, corrected draft, exact publication/send approval.

## Privacy or legal request

- **Detect:** access/deletion request, legal hold, data-location concern, or
  retention conflict.
- **Contain:** do not delete or disclose through an agent. Route to the owner or
  designated privacy/legal operator.
- **Recover:** verify identity and jurisdiction, map sources/artifacts/audits,
  apply the approved retention/legal-hold decision, and record evidence without
  exposing sensitive content.

## Backup restore

- **Prepare:** identify Supabase project/region, backup ID/time, RPO/RTO, and a
  disposable restore target.
- **Execute:** platform owner restores to the non-production target.
- **Verify:** schema count, representative tenant rows, RLS, encrypted fields,
  audit-chain readability, and application smoke tests.
- **Close:** record duration, data gap, evidence links, failures, and cleanup.
  This runbook has not been rehearsed because platform authority is unavailable.

## Destructive-change recovery

- Disable the feature and stop the actor.
- Identify exact deleted/overwritten objects and the approval/audit record.
- Do not improvise direct production SQL.
- Restore to an isolated target, compare hashes/counts, prepare a reviewed
  forward repair, obtain owner approval, then apply and observe.

## Escalation requirements

Critical security/privacy incidents, production mutation, public correction,
financial action, legal representation, restore, credential scope expansion,
and feature enablement require the owner/operator identified in
`../BLOCKERS.md`. If that person cannot be reached, keep execution paused.
