# SaaS Operations Center

This directory is the evidence and operating record for the additive,
feature-flagged SaaS Operations Center.

The authoritative build specification is
`C:\Users\mitch\Downloads\SaaS_Operations_Center_Codex_Master_MetaPrompt.md`
(version 1.0, read in full before work began). Repository-native behavior and
the instructions recorded in
[`evidence/phase-0-preflight.md`](evidence/phase-0-preflight.md) remain binding.

## Sources of truth

- [`EXECUTION_STATUS.md`](EXECUTION_STATUS.md): current execution truth
- [`TRACEABILITY.md`](TRACEABILITY.md): definition-of-done coverage
- [`BLOCKERS.md`](BLOCKERS.md): exact external blockers and owner actions
- [`24-final-execution-report.md`](24-final-execution-report.md): concise handoff
- [`21-compatibility-and-release-manifest.md`](21-compatibility-and-release-manifest.md):
  release and rollback sequence
- [`25-automated-database-release.md`](25-automated-database-release.md):
  protected migration automation and secure configuration
- [`23-first-30-days.md`](23-first-30-days.md): bounded operating plan
- `evidence/`: reproducible command and inspection evidence
- `decisions/`: material decisions, conflicts, and deviations
- `runbooks/`: operational response and rollback procedures
- `schemas/`: stable Operations Center contracts

## Safety boundary

No document in this directory independently authorizes production deployment,
production data mutation, live communication, public publication, financial
action, or permission expansion. Those remain owner-controlled, exact-payload
actions enforced through the release gates.
