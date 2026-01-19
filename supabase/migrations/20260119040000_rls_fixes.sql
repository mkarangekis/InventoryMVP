-- Tighten RLS to location-level for lines tables.

drop policy if exists "drink_spec_lines_select" on drink_spec_lines;
create policy "drink_spec_lines_select" on drink_spec_lines
  for select
  using (exists (
    select 1
    from drink_specs ds
    join user_locations ul on ul.location_id = ds.location_id
    where ds.id = drink_spec_lines.drink_spec_id
      and ul.user_id = auth.uid()
  ));

drop policy if exists "purchase_order_lines_select" on purchase_order_lines;
create policy "purchase_order_lines_select" on purchase_order_lines
  for select
  using (exists (
    select 1
    from purchase_orders po
    join user_locations ul on ul.location_id = po.location_id
    where po.id = purchase_order_lines.purchase_order_id
      and ul.user_id = auth.uid()
  ));
