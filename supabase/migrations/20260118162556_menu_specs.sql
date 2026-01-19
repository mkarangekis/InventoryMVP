create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  type text not null,
  default_unit_oz numeric(12,2)
);

create table if not exists ingredient_costs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  cost_per_oz numeric(12,4) not null,
  effective_from timestamptz not null,
  effective_to timestamptz
);

create table if not exists drink_specs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  version integer not null,
  glass_type text not null,
  ice_type text not null,
  target_pour_oz numeric(12,2) not null,
  notes text,
  active integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists drink_spec_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  drink_spec_id uuid not null references drink_specs(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  ounces numeric(12,2) not null
);

create index if not exists ingredients_tenant_id_idx on ingredients(tenant_id);
create index if not exists ingredient_costs_tenant_id_idx on ingredient_costs(tenant_id);
create index if not exists ingredient_costs_ingredient_id_idx on ingredient_costs(ingredient_id);
create index if not exists drink_specs_tenant_id_idx on drink_specs(tenant_id);
create index if not exists drink_specs_location_id_idx on drink_specs(location_id);
create index if not exists drink_specs_menu_item_id_idx on drink_specs(menu_item_id);
create index if not exists drink_spec_lines_tenant_id_idx on drink_spec_lines(tenant_id);
create index if not exists drink_spec_lines_drink_spec_id_idx on drink_spec_lines(drink_spec_id);
create index if not exists drink_spec_lines_ingredient_id_idx on drink_spec_lines(ingredient_id);

alter table ingredients enable row level security;
alter table ingredient_costs enable row level security;
alter table drink_specs enable row level security;
alter table drink_spec_lines enable row level security;

create policy "ingredients_select" on ingredients
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = ingredients.tenant_id
  ));

create policy "ingredients_service_only" on ingredients
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "ingredient_costs_select" on ingredient_costs
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = ingredient_costs.tenant_id
  ));

create policy "ingredient_costs_service_only" on ingredient_costs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "drink_specs_select" on drink_specs
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = drink_specs.location_id
  ));

create policy "drink_specs_service_only" on drink_specs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "drink_spec_lines_select" on drink_spec_lines
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = drink_spec_lines.tenant_id
  ));

create policy "drink_spec_lines_service_only" on drink_spec_lines
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');