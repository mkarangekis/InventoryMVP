-- Unique constraints on POS order tables to enable idempotent replays.
-- Without these, replaying a webhook creates duplicate rows.

ALTER TABLE pos_orders
  ADD CONSTRAINT pos_orders_unique_per_location
    UNIQUE (tenant_id, location_id, pos_order_id);

ALTER TABLE pos_order_items
  ADD CONSTRAINT pos_order_items_unique_per_location
    UNIQUE (tenant_id, location_id, pos_item_id);

-- menu_items: unique pos_menu_item_id per location
ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_unique_per_location
    UNIQUE (tenant_id, location_id, pos_menu_item_id);

-- Add source column index to pos_import_runs for health-check queries
CREATE INDEX IF NOT EXISTS pos_import_runs_source_idx ON pos_import_runs (source);
CREATE INDEX IF NOT EXISTS pos_import_runs_status_started_idx ON pos_import_runs (status, started_at DESC);
