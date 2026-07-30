-- Additive Operations Center control-plane schema.
-- This migration is intentionally not applied by the implementation branch.

create or replace function public.is_operations_owner(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.tenant_id = target_tenant
      and profile.role = 'owner'
      and auth.jwt() -> 'app_metadata' ->> 'operations_center_role' = 'owner'
  );
$$;

revoke all on function public.is_operations_owner(uuid) from public;
grant execute on function public.is_operations_owner(uuid) to authenticated;
grant execute on function public.is_operations_owner(uuid) to service_role;

create table if not exists ops_workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  environment text not null default 'unknown'
    check (environment in ('local', 'preview', 'staging', 'production', 'unknown')),
  emergency_paused boolean not null default true,
  execution_enabled boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ops_policy_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  version text not null,
  policy jsonb not null,
  policy_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, version),
  unique (tenant_id, policy_hash)
);

create table if not exists ops_evidence_references (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  source_type text not null
    check (source_type in ('repository', 'test', 'configuration', 'integration')),
  source text not null,
  observed_at timestamptz not null,
  freshness text not null check (freshness in ('current', 'stale', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  synthetic boolean not null default false,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ops_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  signal_type text not null,
  title text not null,
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  observed_at timestamptz not null,
  expires_at timestamptz,
  evidence_ids uuid[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ops_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  category text not null,
  impact smallint not null check (impact between 1 and 5),
  confidence smallint not null check (confidence between 1 and 5),
  effort smallint not null check (effort between 1 and 5),
  risk smallint not null check (risk between 1 and 5),
  score numeric(8, 2) not null,
  scoring_version text not null,
  evidence_ids uuid[] not null default '{}',
  status text not null default 'identified'
    check (status in ('identified', 'accepted', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ops_work_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  opportunity_id uuid references ops_opportunities(id) on delete set null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'in_progress', 'verification', 'done', 'blocked')),
  autonomy_tier text not null check (autonomy_tier in ('A', 'B', 'C', 'D')),
  acceptance_criteria jsonb not null default '[]'::jsonb,
  verification_plan jsonb not null default '[]'::jsonb,
  rollback_plan jsonb not null default '[]'::jsonb,
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ops_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  work_item_id uuid not null references ops_work_items(id) on delete cascade,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'leased', 'running', 'completed', 'failed', 'dead_lettered')),
  idempotency_key text not null,
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists ops_agent_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  agent_key text not null,
  version text not null,
  name text not null,
  purpose text not null,
  mode text not null default 'disabled'
    check (mode in ('disabled', 'mock', 'read_only')),
  autonomy_tier text not null check (autonomy_tier in ('A', 'B', 'C', 'D')),
  model_provider text not null check (model_provider in ('openai', 'none')),
  model text,
  prompt_hash text,
  input_schema_version text not null,
  output_schema_version text not null,
  max_runtime_ms integer not null check (max_runtime_ms between 1 and 300000),
  max_cost_usd numeric(10, 4) not null check (max_cost_usd >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, agent_key, version)
);

create table if not exists ops_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  agent_definition_id uuid not null references ops_agent_definitions(id),
  work_item_id uuid references ops_work_items(id) on delete set null,
  status text not null
    check (status in ('queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled')),
  idempotency_key text not null,
  input_hash text not null,
  output_hash text,
  model text,
  prompt_version text not null,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  cost_usd numeric(10, 4) check (cost_usd >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists ops_artifacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  agent_run_id uuid references ops_agent_runs(id) on delete set null,
  artifact_type text not null,
  storage_uri text,
  content_hash text not null,
  classification text not null default 'internal'
    check (classification in ('public', 'internal', 'confidential', 'restricted')),
  retention_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ops_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  action_type text not null,
  environment text not null
    check (environment in ('local', 'preview', 'staging', 'production', 'unknown')),
  autonomy_tier text not null default 'C' check (autonomy_tier = 'C'),
  payload_hash text not null,
  requested_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'consumed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  consumed_at timestamptz,
  check (approved_by is null or approved_by <> requested_by)
);

create table if not exists ops_connector_installations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  connector_key text not null,
  status text not null default 'disabled'
    check (status in ('disabled', 'mock', 'unconfigured', 'unverified', 'connected', 'revoked')),
  access_mode text not null default 'none'
    check (access_mode in ('none', 'read_only', 'read_write')),
  scopes text[] not null default '{}',
  encrypted_credentials bytea,
  credential_key_version text,
  last_verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, connector_key)
);

create table if not exists ops_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  schedule_key text not null,
  cron_expression text not null,
  enabled boolean not null default false,
  autonomy_tier text not null check (autonomy_tier in ('A', 'B', 'C')),
  lease_owner text,
  lease_expires_at timestamptz,
  last_idempotency_key text,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, schedule_key)
);

create table if not exists ops_dead_letters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  task_id uuid references ops_tasks(id) on delete set null,
  agent_run_id uuid references ops_agent_runs(id) on delete set null,
  reason_code text not null,
  detail text,
  retryable boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create table if not exists ops_metric_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  metric_key text not null,
  name text not null,
  definition text not null,
  source text not null,
  grain text not null,
  denominator text,
  time_window text not null,
  quality_tests jsonb not null default '[]'::jsonb,
  version text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, metric_key, version)
);

create table if not exists ops_customer_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_tenant_id uuid not null references tenants(id) on delete cascade,
  score numeric(8, 2) not null,
  scoring_version text not null,
  factors jsonb not null,
  evidence_ids uuid[] not null default '{}',
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists ops_experiments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  hypothesis text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'running', 'paused', 'completed', 'cancelled')),
  cohort_definition jsonb not null,
  exposure_channel text,
  success_metric_id uuid references ops_metric_definitions(id),
  guardrail_metric_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists ops_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_type text not null check (actor_type in ('user', 'agent', 'system')),
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text,
  environment text not null,
  autonomy_tier text not null check (autonomy_tier in ('A', 'B', 'C', 'D')),
  decision_code text not null,
  payload_hash text,
  approval_request_id uuid references ops_approval_requests(id),
  previous_event_hash text,
  event_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, event_hash)
);

create index if not exists ops_signals_tenant_status_idx
  on ops_signals(tenant_id, status, observed_at desc);
create index if not exists ops_opportunities_tenant_score_idx
  on ops_opportunities(tenant_id, score desc);
create index if not exists ops_work_items_tenant_status_idx
  on ops_work_items(tenant_id, status);
create index if not exists ops_agent_runs_tenant_created_idx
  on ops_agent_runs(tenant_id, created_at desc);
create index if not exists ops_approvals_tenant_status_idx
  on ops_approval_requests(tenant_id, status, expires_at);
create index if not exists ops_audit_tenant_created_idx
  on ops_audit_events(tenant_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ops_workspaces',
    'ops_policy_versions',
    'ops_evidence_references',
    'ops_signals',
    'ops_opportunities',
    'ops_work_items',
    'ops_tasks',
    'ops_agent_definitions',
    'ops_agent_runs',
    'ops_artifacts',
    'ops_approval_requests',
    'ops_connector_installations',
    'ops_schedules',
    'ops_dead_letters',
    'ops_metric_definitions',
    'ops_customer_health_snapshots',
    'ops_experiments',
    'ops_audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_operations_owner(tenant_id))',
      table_name || '_owner_select',
      table_name
    );
  end loop;
end
$$;

create or replace function public.reject_ops_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ops_audit_events is append-only';
end;
$$;

drop trigger if exists ops_audit_events_immutable on ops_audit_events;
create trigger ops_audit_events_immutable
before update or delete on ops_audit_events
for each row execute function public.reject_ops_audit_mutation();

comment on table ops_connector_installations is
  'Operations connector metadata. Credentials must be application-encrypted before insertion.';
comment on table ops_audit_events is
  'Append-only Operations audit chain. Updates and deletes are rejected by trigger.';
