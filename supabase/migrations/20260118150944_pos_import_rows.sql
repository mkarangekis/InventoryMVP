create table if not exists pos_import_rows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  import_run_id uuid not null references pos_import_runs(id) on delete cascade,
  row_type text not null,
  row_number integer not null,
  row_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pos_import_rows_tenant_id_idx on pos_import_rows(tenant_id);
create index if not exists pos_import_rows_location_id_idx on pos_import_rows(location_id);
create index if not exists pos_import_rows_import_run_id_idx on pos_import_rows(import_run_id);

alter table pos_import_rows enable row level security;

create policy "pos_import_rows_select" on pos_import_rows
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_import_rows.location_id
  ));

create policy "pos_import_rows_service_only" on pos_import_rows
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');