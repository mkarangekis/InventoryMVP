# Authentication and Authorization

## Authentication

The existing login uses Supabase email/password authentication. Sessions are
held in the browser client and Bearer access tokens are sent to API routes.
Signup may create a Stripe checkout session and routes into onboarding.

Evidence: `src/app/login/page.tsx`, `src/app/auth/callback/page.tsx`,
`src/lib/supabase/browser.ts`. Confidence: confirmed. Impact if wrong: high.

## Current authenticated shell

`src/app/(authed)/layout.tsx` is a client component. It redirects to `/login`
only after `supabaseBrowser.auth.getSession()`. Baseline HTTP characterization
therefore returns status 200 and page HTML for `/dashboard` without a session,
although subsequent API calls return 401. Sensitive data is not present in the
static HTML baseline.

Operations Center routes require server-side access enforcement and must not
rely on this shell alone.

## Role and permission model

- `user_profiles.role` exists.
- Onboarding and demo seeding write `owner`.
- The pilot guide names owner/manager and analyst/operator responsibilities.
- No application route checks `user_profiles.role`.
- There is no current admin namespace, admin navigation, super-admin role,
  permission table, or fresh-auth flow.

The safe native policy is:

```text
operations_center.access := authenticated profile role = owner
  AND auth app_metadata.operations_center_role = owner
operations_center.approve := owner plus fresh-auth evidence
```

`super_admin` is reserved for compatibility but is not seeded by this work.
No user role is broadened.

## Tenant and object scope

Most APIs:

1. Validate Bearer token with Supabase Auth.
2. Resolve user profile and/or locations with the service-role client.
3. Restrict business queries to the resolved tenant/location set.

AI APIs share `getUserScope`. Several routes duplicate scope resolution. A
central Operations Center guard will fail closed on missing profile, role,
tenant, or requested workspace.

## Authorization risks

1. No role checks on high-impact current actions such as PO approve/send,
   webhook management, integration management, jobs, and inventory writes.
2. Square OAuth state is unsigned and location access is not validated before
   redirect or callback upsert.
3. Audit location filtering accepts a requested location without checking it
   against `scopedLocationIds`; tenant filtering limits cross-tenant impact but
   not same-tenant least privilege.
4. Service-role code means database RLS is defense-in-depth, not the primary
   authorization barrier.
5. Query-string tokens are accepted by PO rendering and can leak through URLs.
6. No fresh authentication mechanism exists.

These are pre-existing risks. The Operations Center will not replicate them.
Changes to existing workflows will be separately scoped and characterized.

## Required Operations Center permissions

| Permission                          | Default role        |
| ----------------------------------- | ------------------- |
| `operations_center.access`          | owner               |
| `operations_center.view_sensitive`  | owner + fresh auth  |
| `operations_center.run_analysis`    | owner               |
| `operations_center.run_isolated`    | owner, feature flag |
| `operations_center.approve`         | owner + fresh auth  |
| `operations_center.connect`         | owner + approval    |
| `operations_center.export`          | owner + fresh auth  |
| `operations_center.change_policy`   | owner + approval    |
| `operations_center.emergency_pause` | owner               |

Production deploy, publish, send, billing, pricing, and financial permissions
are deliberately not granted to the application or an agent by default.
