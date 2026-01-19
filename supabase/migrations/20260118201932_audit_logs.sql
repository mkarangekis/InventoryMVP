create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_id_idx on audit_logs(tenant_id);
create index if not exists audit_logs_location_id_idx on audit_logs(location_id);
create index if not exists audit_logs_action_idx on audit_logs(action);

alter table audit_logs enable row level security;

create policy "audit_logs_service_only" on audit_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');