\set ON_ERROR_STOP on

do $historical_migrations$
declare
  missing text;
begin
  select string_agg(name, ', ' order by name)
    into missing
  from unnest(array[
    'webhook_endpoints',
    'webhook_deliveries',
    'user_notification_prefs',
    'pos_connections'
  ]) as expected(name)
  where to_regclass(format('public.%I', name)) is null;

  if missing is not null then
    raise exception 'Missing reconciled tables: %', missing;
  end if;

  select string_agg(class.relname, ', ' order by class.relname)
    into missing
  from pg_class as class
  join pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname = any(array[
      'webhook_endpoints',
      'webhook_deliveries',
      'user_notification_prefs',
      'pos_connections'
    ])
    and not class.relrowsecurity;

  if missing is not null then
    raise exception 'Reconciled tables without RLS: %', missing;
  end if;

  select string_agg(expected.policy_name, ', ' order by expected.policy_name)
    into missing
  from (
    values
      ('webhook_endpoints', 'tenant webhook endpoints'),
      ('webhook_deliveries', 'tenant webhook deliveries'),
      ('user_notification_prefs', 'own prefs'),
      ('pos_connections', 'users read own pos_connections'),
      ('pos_connections', 'users manage own pos_connections')
  ) as expected(table_name, policy_name)
  where not exists (
    select 1
    from pg_policies as policies
    where policies.schemaname = 'public'
      and policies.tablename = expected.table_name
      and policies.policyname = expected.policy_name
  );

  if missing is not null then
    raise exception 'Missing reconciled RLS policies: %', missing;
  end if;

  select string_agg(expected.constraint_name, ', ' order by expected.constraint_name)
    into missing
  from unnest(array[
    'pos_orders_unique_per_location',
    'pos_order_items_unique_per_location',
    'menu_items_unique_per_location'
  ]) as expected(constraint_name)
  where not exists (
    select 1
    from pg_constraint as constraints
    join pg_namespace as namespace
      on namespace.oid = constraints.connamespace
    where namespace.nspname = 'public'
      and constraints.conname = expected.constraint_name
      and constraints.contype = 'u'
  );

  if missing is not null then
    raise exception 'Missing POS idempotency constraints: %', missing;
  end if;

  select string_agg(expected.index_name, ', ' order by expected.index_name)
    into missing
  from unnest(array[
    'webhook_deliveries_endpoint_id',
    'webhook_deliveries_status',
    'pos_connections_location_idx',
    'pos_connections_tenant_idx',
    'pos_connections_sftp_username_idx',
    'pos_connections_ingest_email_idx',
    'pos_import_runs_source_idx',
    'pos_import_runs_status_started_idx'
  ]) as expected(index_name)
  where to_regclass(format('public.%I', expected.index_name)) is null;

  if missing is not null then
    raise exception 'Missing reconciled indexes: %', missing;
  end if;

  raise notice 'Verified historical webhook, preference, POS, and idempotency migrations';
end
$historical_migrations$;

do $storage_bucket$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'pos-imports'
      and name = 'pos-imports'
      and public is false
      and file_size_limit = 104857600
      and allowed_mime_types = array[
        'text/csv',
        'text/plain',
        'application/octet-stream'
      ]::text[]
  ) then
    raise exception 'The reconciled pos-imports bucket is incompatible';
  end if;

  raise notice 'Verified reconciled pos-imports bucket';
end
$storage_bucket$;
