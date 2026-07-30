\set ON_ERROR_STOP on

do $ai_upgrade$
declare
  missing text;
  policy_count integer;
begin
  select string_agg(name, ', ' order by name)
    into missing
  from unnest(array[
    'variance_baselines',
    'location_events',
    'ai_insight_feedback'
  ]) as expected(name)
  where to_regclass(format('public.%I', name)) is null;

  if missing is not null then
    raise exception 'Missing AI-upgrade tables: %', missing;
  end if;

  select string_agg(expected.column_name, ', ' order by expected.column_name)
    into missing
  from (
    values
      ('variance_flags', 'z_score'),
      ('variance_flags', 'baseline_mean_oz'),
      ('variance_flags', 'baseline_stddev_oz'),
      ('demand_forecasts_daily', 'lo_80'),
      ('demand_forecasts_daily', 'hi_80'),
      ('demand_forecasts_daily', 'lo_95'),
      ('demand_forecasts_daily', 'hi_95')
  ) as expected(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns as columns
    where columns.table_schema = 'public'
      and columns.table_name = expected.table_name
      and columns.column_name = expected.column_name
      and columns.data_type = 'numeric'
  );

  if missing is not null then
    raise exception 'Missing or incompatible AI-upgrade columns: %', missing;
  end if;

  select string_agg(class.relname, ', ' order by class.relname)
    into missing
  from pg_class as class
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname = any(array[
      'variance_baselines',
      'location_events',
      'ai_insight_feedback'
    ])
    and not class.relrowsecurity;

  if missing is not null then
    raise exception 'AI-upgrade tables without RLS: %', missing;
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array[
      'variance_baselines',
      'location_events',
      'ai_insight_feedback'
    ])
    and policyname = 'tenant_isolation'
    and cmd = 'ALL'
    and qual like '%auth.jwt()%'
    and qual like '%app_metadata%'
    and qual like '%tenant_id%';

  if policy_count <> 3 then
    raise exception 'Expected 3 AI-upgrade tenant policies, found %', policy_count;
  end if;

  if to_regclass('public.idx_location_events_date') is null then
    raise exception 'Missing idx_location_events_date';
  end if;

  if to_regclass('public.idx_ai_feedback_feature') is null then
    raise exception 'Missing idx_ai_feedback_feature';
  end if;

  raise notice 'Verified logical contents of migration 20260401000000';
end
$ai_upgrade$;
