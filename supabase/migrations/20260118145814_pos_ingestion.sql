create table if not exists pos_import_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  source text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_summary text
);

create table if not exists pos_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  pos_order_id text not null,
  opened_at timestamptz not null,
  closed_at timestamptz not null,
  subtotal numeric(12,2) not null,
  tax numeric(12,2) not null,
  total numeric(12,2) not null,
  status text not null
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  pos_menu_item_id text,
  name text not null,
  category text,
  base_price numeric(12,2),
  is_active integer not null default 1
);

create table if not exists pos_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  pos_item_id text not null,
  pos_order_id text not null,
  menu_item_id uuid references menu_items(id),
  name text not null,
  quantity integer not null,
  price_each numeric(12,2) not null,
  gross numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists pos_modifiers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  pos_item_id text not null,
  name text not null,
  price_delta numeric(12,2) not null
);

create table if not exists pos_voids_comps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  pos_item_id text not null,
  type text not null,
  reason text,
  amount numeric(12,2) not null
);

create index if not exists pos_import_runs_tenant_id_idx on pos_import_runs(tenant_id);
create index if not exists pos_import_runs_location_id_idx on pos_import_runs(location_id);
create index if not exists pos_orders_tenant_id_idx on pos_orders(tenant_id);
create index if not exists pos_orders_location_id_idx on pos_orders(location_id);
create index if not exists pos_orders_closed_at_idx on pos_orders(closed_at);
create index if not exists pos_order_items_tenant_id_idx on pos_order_items(tenant_id);
create index if not exists pos_order_items_location_id_idx on pos_order_items(location_id);
create index if not exists pos_order_items_menu_item_id_idx on pos_order_items(menu_item_id);
create index if not exists pos_modifiers_tenant_id_idx on pos_modifiers(tenant_id);
create index if not exists pos_modifiers_location_id_idx on pos_modifiers(location_id);
create index if not exists pos_voids_comps_tenant_id_idx on pos_voids_comps(tenant_id);
create index if not exists pos_voids_comps_location_id_idx on pos_voids_comps(location_id);
create index if not exists menu_items_tenant_id_idx on menu_items(tenant_id);
create index if not exists menu_items_location_id_idx on menu_items(location_id);

alter table pos_import_runs enable row level security;
alter table pos_orders enable row level security;
alter table pos_order_items enable row level security;
alter table pos_modifiers enable row level security;
alter table pos_voids_comps enable row level security;
alter table menu_items enable row level security;

create policy "pos_import_runs_select" on pos_import_runs
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_import_runs.location_id
  ));

create policy "pos_import_runs_service_only" on pos_import_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "pos_orders_select" on pos_orders
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_orders.location_id
  ));

create policy "pos_orders_service_only" on pos_orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "pos_order_items_select" on pos_order_items
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_order_items.location_id
  ));

create policy "pos_order_items_service_only" on pos_order_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "pos_modifiers_select" on pos_modifiers
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_modifiers.location_id
  ));

create policy "pos_modifiers_service_only" on pos_modifiers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "pos_voids_comps_select" on pos_voids_comps
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = pos_voids_comps.location_id
  ));

create policy "pos_voids_comps_service_only" on pos_voids_comps
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "menu_items_select" on menu_items
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = menu_items.location_id
  ));

create policy "menu_items_service_only" on menu_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');