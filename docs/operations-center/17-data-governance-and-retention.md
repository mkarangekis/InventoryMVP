# Data Governance and Retention

## Data minimization

- Store evidence locators and hashes rather than copied content when possible.
- Never store or expose secret values; use opaque secret references.
- Do not send billing, connector credentials, raw support content, raw POS
  rows, or personal data to a model by default.
- Tenant key is mandatory for tenant-derived Operations records.
- Synthetic/demo data is explicitly classified.

## Proposed retention defaults

These are conservative implementation defaults, not legal determinations:

| Data                         |                 Proposed default | Rationale                              |
| ---------------------------- | -------------------------------: | -------------------------------------- |
| Raw model input/output       |                          30 days | debugging with bounded exposure        |
| Structured run result        |                         180 days | quality and audit                      |
| Tool/runner logs             |                          30 days | operational diagnosis                  |
| Patches/preview artifacts    |                          90 days | review/rollback                        |
| Evidence metadata/hashes     |                         365 days | provenance                             |
| Approval decisions           | 7 years or contract/legal policy | accountability; owner/legal validation |
| Audit events                 | 7 years or contract/legal policy | accountability; owner/legal validation |
| Customer/support raw content |               no copy by default | minimize                               |
| Connector cursor/health      |  installation lifetime + 30 days | sync recovery                          |

If repository contracts or law require shorter/longer periods, the safer
binding rule applies and this table must be revised before production.

## Deletion and revocation

- Connector revoke disables use and deletes/revokes secret reference material
  through the existing secret system.
- Operations-derived tenant content follows tenant deletion/retention policy.
- Approval/audit deletion is not available to the normal application role.
- Exports require fresh auth, scope checks, audit, and bounded content.

## Owner/legal unknowns

- Lawful/contractual basis
- Data residency
- Subprocessors
- Customer contract retention
- Regulatory record requirements
- Backup deletion semantics
- Subject access/deletion workflow

See `BLOCKERS.md` before production enablement.
