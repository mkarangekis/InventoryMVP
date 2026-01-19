create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  name_override text,
  container_type text not null,
  container_size_oz numeric(12,2) not null,
  is_active integer not null default 1
);

create table if not exists inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  snapshot_date timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists inventory_snapshot_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  snapshot_id uuid not null references inventory_snapshots(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  actual_remaining_oz numeric(12,2) not null
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  movement_date timestamptz not null,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  delta_oz numeric(12,2) not null,
  reason text not null,
  ref_id uuid
);

create index if not exists inventory_items_tenant_id_idx on inventory_items(tenant_id);
create index if not exists inventory_items_location_id_idx on inventory_items(location_id);
create index if not exists inventory_items_ingredient_id_idx on inventory_items(ingredient_id);
create index if not exists inventory_snapshots_tenant_id_idx on inventory_snapshots(tenant_id);
create index if not exists inventory_snapshots_location_id_idx on inventory_snapshots(location_id);
create index if not exists inventory_snapshot_lines_tenant_id_idx on inventory_snapshot_lines(tenant_id);
create index if not exists inventory_snapshot_lines_snapshot_id_idx on inventory_snapshot_lines(snapshot_id);
create index if not exists inventory_snapshot_lines_inventory_item_id_idx on inventory_snapshot_lines(inventory_item_id);
create index if not exists inventory_movements_tenant_id_idx on inventory_movements(tenant_id);
create index if not exists inventory_movements_location_id_idx on inventory_movements(location_id);
create index if not exists inventory_movements_inventory_item_id_idx on inventory_movements(inventory_item_id);

alter table inventory_items enable row level security;
alter table inventory_snapshots enable row level security;
alter table inventory_snapshot_lines enable row level security;
alter table inventory_movements enable row level security;

create policy "inventory_items_select" on inventory_items
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = inventory_items.location_id
  ));

create policy "inventory_items_service_only" on inventory_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "inventory_snapshots_select" on inventory_snapshots
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = inventory_snapshots.location_id
  ));

create policy "inventory_snapshots_service_only" on inventory_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "inventory_snapshot_lines_select" on inventory_snapshot_lines
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = (
        select location_id from inventory_snapshots s
        where s.id = inventory_snapshot_lines.snapshot_id
      )
  ));

create policy "inventory_snapshot_lines_service_only" on inventory_snapshot_lines
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "inventory_movements_select" on inventory_movements
  for select
  using (exists (
    select 1 from user_locations ul
    where ul.user_id = auth.uid()
      and ul.location_id = inventory_movements.location_id
  ));

create policy "inventory_movements_service_only" on inventory_movements
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');