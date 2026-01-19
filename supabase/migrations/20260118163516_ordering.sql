create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  email text,
  phone text
);

create table if not exists vendor_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  sku text not null,
  unit_size_oz numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  lead_time_days integer not null
);

create table if not exists reorder_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  reorder_point_oz numeric(12,2) not null,
  par_level_oz numeric(12,2) not null,
  safety_buffer_days integer not null,
  lead_time_days integer not null
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  qty_units integer not null,
  unit_size_oz numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create index if not exists vendors_tenant_id_idx on vendors(tenant_id);
create index if not exists vendor_items_tenant_id_idx on vendor_items(tenant_id);
create index if not exists vendor_items_vendor_id_idx on vendor_items(vendor_id);
create index if not exists vendor_items_inventory_item_id_idx on vendor_items(inventory_item_id);
create index if not exists reorder_policies_tenant_id_idx on reorder_policies(tenant_id);
create index if not exists reorder_policies_location_id_idx on reorder_policies(location_id);
create index if not exists reorder_policies_inventory_item_id_idx on reorder_policies(inventory_item_id);
create index if not exists purchase_orders_tenant_id_idx on purchase_orders(tenant_id);
create index if not exists purchase_orders_location_id_idx on purchase_orders(location_id);
create index if not exists purchase_orders_status_vendor_id_idx on purchase_orders(status, vendor_id);
create index if not exists purchase_order_lines_tenant_id_idx on purchase_order_lines(tenant_id);
create index if not exists purchase_order_lines_purchase_order_id_idx on purchase_order_lines(purchase_order_id);
create index if not exists purchase_order_lines_inventory_item_id_idx on purchase_order_lines(inventory_item_id);

alter table vendors enable row level security;
alter table vendor_items enable row level security;
alter table reorder_policies enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;

create policy "vendors_select" on vendors
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = vendors.tenant_id
  ));

create policy "vendors_service_only" on vendors
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "vendor_items_select" on vendor_items
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = vendor_items.tenant_id
  ));

create policy "vendor_items_service_only" on vendor_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "reorder_policies_select" on reorder_policies
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = reorder_policies.location_id
  ));

create policy "reorder_policies_service_only" on reorder_policies
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "purchase_orders_select" on purchase_orders
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = purchase_orders.location_id
  ));

create policy "purchase_orders_service_only" on purchase_orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "purchase_order_lines_select" on purchase_order_lines
  for select
  using (exists (
    select 1 from user_profiles up
    where up.id = auth.uid()
      and up.tenant_id = purchase_order_lines.tenant_id
  ));

create policy "purchase_order_lines_service_only" on purchase_order_lines
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');