create extension if not exists "pgcrypto";

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  address text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_locations (
  user_id uuid not null references user_profiles(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

create index if not exists locations_tenant_id_idx on locations(tenant_id);
create index if not exists user_profiles_tenant_id_idx on user_profiles(tenant_id);
create index if not exists user_locations_user_id_idx on user_locations(user_id);
create index if not exists user_locations_location_id_idx on user_locations(location_id);

alter table tenants enable row level security;
alter table locations enable row level security;
alter table user_profiles enable row level security;
alter table user_locations enable row level security;

create policy "tenants_select" on tenants
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = tenants.id
  ));

create policy "tenants_service_only" on tenants
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "locations_select" on locations
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = locations.id
  ));

create policy "locations_service_only" on locations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "user_profiles_select" on user_profiles
  for select
  using (id = auth.uid());

create policy "user_profiles_service_only" on user_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "user_locations_select" on user_locations
  for select
  using (user_id = auth.uid());

create policy "user_locations_service_only" on user_locations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');