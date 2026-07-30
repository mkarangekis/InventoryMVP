# Operations Center Authorization Matrix

| Surface                                     |         Anonymous | Authenticated non-owner |        Demo owner | Tenant owner without grant | Explicit Operations owner grant |
| ------------------------------------------- | ----------------: | ----------------------: | ----------------: | -------------------------: | ------------------------------: |
| Navigation entry                            |            hidden |                  hidden |            hidden |                     hidden |         allowed after API check |
| `/operations` static shell                  | no sensitive data |       no sensitive data | no sensitive data |          no sensitive data |               no sensitive data |
| `/api/v1/operations/access`                 |               401 |                     403 |               403 |                        403 |                             200 |
| `/api/v1/operations/overview`               |               401 |                     403 |               403 |                        403 |               tenant-scoped 200 |
| Operations tables through authenticated RLS |            denied |                  denied |            denied |                     denied |            read-only own tenant |
| Operations table writes                     |            denied |                  denied |            denied |                     denied |                         denied¹ |
| Tier A internal read                        |            denied |                  denied |            denied |                     denied |            allowed when flagged |
| Tier B internal reversible write            |            denied |                  denied |            denied |                     denied |               paused by default |
| Tier C production/external/financial        |            denied |                  denied |            denied |                     denied |  exact approval plus fresh auth |
| Tier D prohibited action                    |            denied |                  denied |            denied |                     denied |                          denied |

¹ Writes are available only to the service role after the same server policy,
not directly to a human session.

## Scope rules

1. The server derives the tenant from the authenticated user's profile.
2. Client-supplied tenant identifiers do not grant or alter scope.
3. Tenant ownership is necessary but not sufficient. The exact Operations
   allowlist is server-controlled Auth
   `app_metadata.operations_center_role = 'owner'`.
4. The profile and Operations role allowlists each contain only exact `owner`;
   unknown values fail closed.
5. Models, prompts, connector results, and approval payloads cannot grant roles.
6. Approval does not bypass authentication, tenant scope, feature flags, pause,
   separation of duties, expiry, or payload-hash checks.
7. The initial migration grants authenticated users `SELECT` only and limits it
   through owner RLS. Application writes use the service role only after the
   same server policy boundary.

## Fresh authentication

Tier C evaluation requires an authentication time no more than ten minutes old.
The complete reauthentication UX and multi-owner governance need a staging
identity rehearsal before Tier C execution can be enabled.
