\set ON_ERROR_STOP on

do $verification$
declare
  expected_tables constant text[] := array[
    'ops_workspaces',
    'ops_policy_versions',
    'ops_evidence_references',
    'ops_signals',
    'ops_opportunities',
    'ops_work_items',
    'ops_tasks',
    'ops_agent_definitions',
    'ops_agent_runs',
    'ops_artifacts',
    'ops_approval_requests',
    'ops_connector_installations',
    'ops_schedules',
    'ops_dead_letters',
    'ops_metric_definitions',
    'ops_customer_health_snapshots',
    'ops_experiments',
    'ops_audit_events'
  ];
  missing text;
  policy_count integer;
begin
  select string_agg(table_name, ', ' order by table_name)
    into missing
  from unnest(expected_tables) as expected(table_name)
  where to_regclass(format('public.%I', table_name)) is null;

  if missing is not null then
    raise exception 'Missing Operations tables: %', missing;
  end if;

  select string_agg(class.relname, ', ' order by class.relname)
    into missing
  from pg_class as class
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname = any(expected_tables)
    and not class.relrowsecurity;

  if missing is not null then
    raise exception 'Operations tables without RLS: %', missing;
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(expected_tables)
    and policyname = tablename || '_owner_select'
    and cmd = 'SELECT'
    and roles = array['authenticated']::name[];

  if policy_count <> cardinality(expected_tables) then
    raise exception
      'Expected % owner-select policies, found %',
      cardinality(expected_tables),
      policy_count;
  end if;

  if to_regprocedure('public.is_operations_owner(uuid)') is null then
    raise exception 'Missing is_operations_owner(uuid) authorization function';
  end if;

  if not exists (
    select 1
    from pg_trigger as trg
    join pg_class as class on class.oid = trg.tgrelid
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'ops_audit_events'
      and trg.tgname = 'ops_audit_events_immutable'
      and trg.tgenabled <> 'D'
      and not trg.tgisinternal
  ) then
    raise exception 'Missing enabled immutable audit trigger';
  end if;

  raise notice
    'Verified % Operations tables, RLS policies, authorization function, and audit trigger',
    cardinality(expected_tables);
end
$verification$;
