# Dedicated Operations Account

## Outcome

The Operations administrator uses the existing Pourdex/Supabase identity
system through `/operations-login`. It is not a second user store and does not
contain a hard-coded username or password.

The dedicated account:

- signs in with an email address and password;
- cannot self-register from the Operations login entry;
- must have an exact `user_profiles.role = 'owner'` record for one tenant;
- must separately have server-controlled Auth
  `app_metadata.operations_center_role = 'owner'`;
- is denied when the feature flag is off, the tenant/profile is absent, the
  account is a demo account, or the metadata grant is missing;
- bypasses subscription routing only on `/operations` and only after the
  Operations access API approves the session.

## Invitation and password flow

The dry-run-first command is:

```powershell
pnpm ops:provision-owner -- `
  --environment staging `
  --email owner-operations@example.com `
  --tenant-id 11111111-1111-4111-8111-111111111111 `
  --site-url https://staging.example.com
```

Dry-run prints the exact plan and payload hash without connecting to Supabase.
After review, the same command may be run with:

```text
--apply
--confirmation <exact-payload-hash>
--approval-record <reviewed-change-id>
```

`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be supplied
through an approved local/CI secret environment. Never pass them as command
arguments or send them through chat.

Apply mode performs these bounded steps:

1. verifies the tenant exists;
2. refuses to elevate an email that already exists;
3. sends one Supabase invitation to the exact email;
4. creates the owner profile for the exact tenant;
5. adds only the Operations-owner app-metadata grant;
6. deletes the newly created profile/user if provisioning fails.

The invite redirects to `/operations-activate`, where the owner privately
chooses a password of at least 12 characters. The password is handled directly
by Supabase Auth and is never visible to Codex, the provisioning command, logs,
or repository files. Successful activation verifies Operations access and
opens `/operations`.

## Production activation order

1. Revoke credentials exposed in conversation.
2. Merge and run the protected database migration workflow.
3. Verify migration, RLS, restore evidence, and feature-off behavior.
4. Deploy this dedicated-login revision with flags off.
5. Provision and activate one staging account.
6. Verify authorized, unauthorized, second-tenant, demo, and grant-revocation
   cases.
7. Approve one production email/tenant payload.
8. Provision the production account and verify revocation.
9. Set only `OPERATIONS_CENTER=true` and `OPERATIONS_OVERVIEW=true`, redeploy,
   and run smoke/access checks.

Execution, agents, approvals, connectors, and AI remain disabled.

## Revocation

1. Set `OPERATIONS_CENTER=false` for immediate feature containment.
2. Remove `app_metadata.operations_center_role` from the user.
3. Revoke the user's active sessions.
4. Delete the dedicated profile/account if retention policy permits.
5. Verify `/api/v1/operations/access` returns `403` and Operations navigation
   remains hidden.

Do not delete a customer owner or modify an existing account to perform this
rollback.
