# Local Setup and Configuration

The Operations Center is inert unless its master flag is explicitly enabled.
Do not copy production credentials into a local runner.

## Required local application variables

Use the repository's existing secure local environment mechanism for Supabase
values. The following Operations-only variables are additive:

```dotenv
OPERATIONS_CENTER=false
OPERATIONS_OVERVIEW=false
OPERATIONS_APPROVALS=false
OPERATIONS_AGENTS=false
OPERATIONS_CONNECTORS=false
OPERATIONS_EXECUTION=false
OPERATIONS_EMERGENCY_PAUSE=true
OPERATIONS_ENVIRONMENT=local
OPERATIONS_AI_MODE=disabled
OPERATIONS_OPENAI_MODEL=
OPERATIONS_OPENAI_TIMEOUT_MS=12000
OPERATIONS_OPENAI_MAX_RETRIES=2
```

Safe local evidence-view configuration:

```dotenv
OPERATIONS_CENTER=true
OPERATIONS_OVERVIEW=true
OPERATIONS_APPROVALS=false
OPERATIONS_AGENTS=false
OPERATIONS_CONNECTORS=false
OPERATIONS_EXECUTION=false
OPERATIONS_EMERGENCY_PAUSE=true
OPERATIONS_ENVIRONMENT=local
OPERATIONS_AI_MODE=mock
```

`OPENAI_API_KEY` is server-only and is never required for the local mock.
Never paste a key into source, logs, screenshots, a browser variable, or chat.

## Commands

```text
pnpm install --frozen-lockfile
pnpm test:entitlement
pnpm test:operations
pnpm test:cron-auth
pnpm exec tsc --noEmit
pnpm exec next build
```

Database push, seed scripts, jobs, live connectors, email, billing, and deploy
commands are not part of local verification.

## Expected access

- The existing Supabase session remains the only login.
- Only a non-demo principal with a tenant, `user_profiles.role = 'owner'`, and
  server-controlled Auth `app_metadata.operations_center_role = 'owner'` can
  pass the server API guard.
- Unknown roles and missing profiles fail closed.
- Feature-off API requests return `404`.
- Feature-on requests without a bearer session return `401`.
- The UI navigation entry appears only after the server access check succeeds.
