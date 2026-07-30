# Decision 0001: Extend the Native Modular Monolith

Status: accepted for local implementation

## Context

The repository is one Next.js application with Supabase and several external
workers. The authenticated shell, design system, Auth, data model, and
deployment convention already exist.

## Decision

Implement the Operations Center as a bounded module and admin route namespace
inside the existing application. Reuse Supabase Auth, native tenant keys,
feature flags, API style, styles, migrations, and QStash-compatible jobs.

## Consequences

- No second login or user store.
- No new database or deployment platform.
- Admin-only code remains route-split.
- Control-plane domain logic is kept out of components/prompts/connectors.
- A future service extraction requires measured scale or isolation evidence.

## Safer-rule review

No repository instruction conflicts. The master specification is stricter than
the repository's current client-only shell and missing role checks, so
Operations Center access follows the stricter server-side rule without
silently changing existing customer routes.
