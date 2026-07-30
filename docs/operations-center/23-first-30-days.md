# First 30-Day Operating Plan

This plan begins only after staging gates pass and the owner approves the exact
environment and feature payload.

## Days 1–3: Observe

- Enable read-only overview in staging only.
- Validate evidence freshness, source links, false positives, and tenant scope.
- Review every owner/non-owner denial.
- Keep agents, connectors, execution, and external actions disabled.
- Establish error, denial, cost, queue, and stale-evidence alert routes.

## Days 4–7: Draft

- Enable deterministic mock agents and internal draft artifacts.
- Review schema validity, citation coverage, human acceptance, and edit
  distance.
- Run prompt-injection and malformed-output evals.
- Do not publish, send, deploy, purchase, change billing, or mutate production.

## Week 2: Isolated execution

- Rehearse Tier B code patches in isolated branches/runners.
- Require independent code review, security results, QA evidence, preview,
  rollback plan, and observation checklist.
- Measure success/failure, retry, duration, and cost attribution.

## Week 3: Bounded workflows

- Connect one read-only source at a time with least privilege.
- Rehearse customer health and lifecycle in internal draft mode.
- Validate cohorts before exposure and label correlations honestly.
- Consider one approval-gated external staging workflow only after prior gates.

## Week 4: Outcome review

- Review accepted/rejected recommendations and verified outcomes.
- Reconcile cost, latency, false positive/negative rates, incidents, and access.
- Disable weak agents and stale connectors.
- Promote no autonomy without evidence, policy versioning, and owner approval.

## Initial measures

| Measure                          | Definition                                                       |
| -------------------------------- | ---------------------------------------------------------------- |
| Authorization denial correctness | expected denied cases / all negative cases                       |
| Evidence citation coverage       | output claims with valid evidence / output claims                |
| Schema pass rate                 | validated outputs / completed outputs                            |
| Recommendation acceptance        | accepted internal drafts / reviewed drafts                       |
| Verified outcome rate            | work items with measured outcome / completed work items          |
| Incident rate                    | policy, scope, connector, cost, or reliability incidents per run |
| Cost attribution                 | runs with model/token/cost provenance / model runs               |
