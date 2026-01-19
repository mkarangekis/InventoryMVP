create table if not exists theoretical_usage_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  usage_date date not null,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  ounces_used numeric(12,2) not null,
  computed_at timestamptz not null
);

create table if not exists variance_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  week_start_date date not null,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  expected_remaining_oz numeric(12,2) not null,
  actual_remaining_oz numeric(12,2) not null,
  variance_oz numeric(12,2) not null,
  variance_pct numeric(8,4) not null,
  severity text not null,
  created_at timestamptz not null default now()
);

create table if not exists demand_forecasts_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  forecast_date date not null,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  forecast_usage_oz numeric(12,2) not null,
  method text not null,
  computed_at timestamptz not null
);

create unique index if not exists theoretical_usage_daily_unique_idx
  on theoretical_usage_daily(tenant_id, location_id, usage_date, ingredient_id);
create index if not exists theoretical_usage_daily_usage_date_idx
  on theoretical_usage_daily(usage_date, ingredient_id);
create index if not exists variance_flags_week_item_idx
  on variance_flags(week_start_date, inventory_item_id);
create index if not exists demand_forecasts_daily_date_item_idx
  on demand_forecasts_daily(forecast_date, inventory_item_id);

alter table theoretical_usage_daily enable row level security;
alter table variance_flags enable row level security;
alter table demand_forecasts_daily enable row level security;

create policy "theoretical_usage_daily_select" on theoretical_usage_daily
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = theoretical_usage_daily.location_id
  ));

create policy "theoretical_usage_daily_service_only" on theoretical_usage_daily
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "variance_flags_select" on variance_flags
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = variance_flags.location_id
  ));

create policy "variance_flags_service_only" on variance_flags
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "demand_forecasts_daily_select" on demand_forecasts_daily
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = demand_forecasts_daily.location_id
  ));

create policy "demand_forecasts_daily_service_only" on demand_forecasts_daily
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');