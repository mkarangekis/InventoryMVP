-- Phase 2: Per-ingredient rolling variance baselines (Z-score approach)
create table if not exists variance_baselines (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  location_id         uuid not null references locations(id) on delete cascade,
  inventory_item_id   uuid not null references inventory_items(id) on delete cascade,
  -- 8-week rolling window statistics (updated each time variance job runs)
  rolling_mean_oz     numeric(12,4) not null default 0,
  rolling_stddev_oz   numeric(12,4) not null default 0,
  sample_count        integer not null default 0,
  -- 8-week trend: positive = variance getting worse, negative = improving
  trend_slope         numeric(12,6) not null default 0,
  last_computed_at    timestamp with time zone not null default now(),
  created_at          timestamp with time zone not null default now(),
  unique (tenant_id, location_id, inventory_item_id)
);

-- Phase 2: Store per-flag Z-score alongside variance_flags
alter table variance_flags
  add column if not exists z_score           numeric(8,4),
  add column if not exists baseline_mean_oz  numeric(12,4),
  add column if not exists baseline_stddev_oz numeric(12,4);

-- Phase 1: Confidence interval columns on demand_forecasts_daily
alter table demand_forecasts_daily
  add column if not exists lo_80 numeric(12,4),
  add column if not exists hi_80 numeric(12,4),
  add column if not exists lo_95 numeric(12,4),
  add column if not exists hi_95 numeric(12,4);

-- Phase 1: Events table for forecasting context (happy hour, events, holidays)
create table if not exists location_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  event_date  date not null,
  event_name  text not null,
  event_type  text not null check (event_type in ('holiday','special','promo','closure','large_party')),
  impact_pct  numeric(6,2),   -- expected % lift/drag vs baseline, null = unknown
  notes       text,
  created_at  timestamp with time zone not null default now()
);
create index if not exists idx_location_events_date on location_events(tenant_id, location_id, event_date);

-- Phase 3: AI insight feedback (thumbs up/down on AI outputs)
create table if not exists ai_insight_feedback (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  location_id uuid,
  user_id     uuid,
  feature     text not null,
  prompt_version text not null,
  input_hash  text not null,
  rating      integer not null check (rating in (-1, 1)),  -- -1 = thumbs down, 1 = thumbs up
  comment     text,
  created_at  timestamp with time zone not null default now()
);
create index if not exists idx_ai_feedback_feature on ai_insight_feedback(tenant_id, feature, created_at desc);

-- RLS for new tables
alter table variance_baselines enable row level security;
alter table location_events enable row level security;
alter table ai_insight_feedback enable row level security;

-- variance_baselines policies
create policy "tenant_isolation" on variance_baselines
  using (tenant_id = (select (auth.jwt()->'app_metadata'->>'tenant_id')::uuid));

-- location_events policies
create policy "tenant_isolation" on location_events
  using (tenant_id = (select (auth.jwt()->'app_metadata'->>'tenant_id')::uuid));

-- ai_insight_feedback policies
create policy "tenant_isolation" on ai_insight_feedback
  using (tenant_id = (select (auth.jwt()->'app_metadata'->>'tenant_id')::uuid));
