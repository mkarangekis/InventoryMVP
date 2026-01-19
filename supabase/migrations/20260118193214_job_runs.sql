create table if not exists job_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  location_id uuid,
  job_name text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  details text
);

create index if not exists job_runs_job_name_idx on job_runs(job_name);
create index if not exists job_runs_started_at_idx on job_runs(started_at);

alter table job_runs enable row level security;

create policy "job_runs_service_only" on job_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');