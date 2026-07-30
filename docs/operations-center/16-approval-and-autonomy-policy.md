# Approval and Autonomy Policy

Policy version: `ops-policy-v1`

## Principles

- Models propose; deterministic policy decides.
- No model can edit its own definition, budget, data scope, tools, or policy.
- Unknown action/environment/resource is denied.
- Production, external communication, publication, billing, pricing, finance,
  permission expansion, and destructive data actions require owner authority.
- Approval binds the exact canonical payload hash, actor, target, environment,
  constraints, and expiry.

## Default matrix

| Tier | Decision                     | Examples                                                                           |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------- |
| A    | allow, read-only, audited    | view aggregate synthetic/internal evidence; draft report                           |
| B    | allow only in isolation      | local tests, docs, patch, preview artifact                                         |
| C    | require exact human approval | production, send, publish, deploy, connector write                                 |
| D    | deny                         | self-permission, bypass audit, secret exfiltration, direct protected-branch commit |

## Fresh authentication

Initial implementation will represent fresh-auth as an explicit verifier
interface. Until the host application implements a verified recent-auth claim,
all fresh-auth-required execution is denied. A UI prompt alone is not proof.

## Separation of duties

- Code author cannot be sole reviewer.
- Approval requester cannot approve privilege expansion.
- Executor cannot alter the payload.
- Critical finding cannot be dismissed by its author.
- Public claim author cannot be sole fact checker.

## Emergency pause

The owner may pause schedules, Tier B execution, connector writes, publishing,
campaigns, and coding runners. Read-only views continue. Pause is fail-closed
and audited.

## External actions

No bounded automatic external-write policy is enabled by this build. Future
policies require owner approval and prospective, versioned configuration.
