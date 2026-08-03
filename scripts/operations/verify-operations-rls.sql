\set ON_ERROR_STOP on

begin;

insert into public.tenants (id, name)
values
  ('11111111-1111-4111-8111-111111111111', 'Operations RLS tenant A'),
  ('22222222-2222-4222-8222-222222222222', 'Operations RLS tenant B');

insert into public.user_profiles (id, tenant_id, email, role)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'operations-owner-a@example.invalid',
    'owner'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'operations-owner-b@example.invalid',
    'owner'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'operations-viewer-a@example.invalid',
    'viewer'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '11111111-1111-4111-8111-111111111111',
    'tenant-owner-without-operations-grant@example.invalid',
    'owner'
  );

insert into public.ops_workspaces (tenant_id, environment)
values
  ('11111111-1111-4111-8111-111111111111', 'staging'),
  ('22222222-2222-4222-8222-222222222222', 'staging');

insert into public.ops_audit_events (
  tenant_id,
  actor_type,
  actor_id,
  action,
  target_type,
  target_id,
  environment,
  autonomy_tier,
  decision_code,
  event_hash
)
values (
  '11111111-1111-4111-8111-111111111111',
  'system',
  'rls-verifier',
  'verify',
  'ops_workspaces',
  '11111111-1111-4111-8111-111111111111',
  'staging',
  'A',
  'local_rehearsal',
  'operations-rls-verifier-event'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated","app_metadata":{"operations_center_role":"owner"}}',
  true
);

do $owner_a$
declare
  visible_count integer;
  visible_tenant uuid;
begin
  select count(*), min(tenant_id::text)::uuid
    into visible_count, visible_tenant
  from public.ops_workspaces;

  if visible_count <> 1
    or visible_tenant <> '11111111-1111-4111-8111-111111111111'::uuid
  then
    raise exception
      'Tenant A Operations owner saw % rows for tenant %',
      visible_count,
      visible_tenant;
  end if;

  begin
    insert into public.ops_workspaces (tenant_id, environment)
    values ('11111111-1111-4111-8111-111111111111', 'staging');
    raise exception 'Authenticated Operations owner unexpectedly inserted a row';
  exception
    when insufficient_privilege then null;
  end;
end
$owner_a$;

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","app_metadata":{"operations_center_role":"owner"}}',
  true
);

do $owner_b$
declare
  visible_count integer;
  visible_tenant uuid;
begin
  select count(*), min(tenant_id::text)::uuid
    into visible_count, visible_tenant
  from public.ops_workspaces;

  if visible_count <> 1
    or visible_tenant <> '22222222-2222-4222-8222-222222222222'::uuid
  then
    raise exception
      'Tenant B Operations owner saw % rows for tenant %',
      visible_count,
      visible_tenant;
  end if;
end
$owner_b$;

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated","app_metadata":{"operations_center_role":"owner"}}',
  true
);

do $viewer_denied$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.ops_workspaces;
  if visible_count <> 0 then
    raise exception 'Non-owner profile saw % Operations rows', visible_count;
  end if;
end
$viewer_denied$;

select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated","app_metadata":{}}',
  true
);

do $grant_denied$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.ops_workspaces;
  if visible_count <> 0 then
    raise exception
      'Tenant owner without Operations grant saw % Operations rows',
      visible_count;
  end if;
end
$grant_denied$;

reset role;
set local role anon;

do $anon_denied$
begin
  begin
    perform count(*) from public.ops_workspaces;
    raise exception 'Anonymous role unexpectedly read Operations rows';
  exception
    when insufficient_privilege then null;
  end;
end
$anon_denied$;

reset role;
set local role service_role;

do $service_role_access$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.ops_workspaces;
  if visible_count <> 2 then
    raise exception 'Service role saw % Operations rows instead of 2', visible_count;
  end if;
end
$service_role_access$;

reset role;

do $audit_immutable$
begin
  begin
    update public.ops_audit_events
    set decision_code = 'unexpected_update'
    where event_hash = 'operations-rls-verifier-event';
    raise exception 'Operations audit update unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'ops_audit_events is append-only' then
        raise;
      end if;
  end;

  begin
    delete from public.ops_audit_events
    where event_hash = 'operations-rls-verifier-event';
    raise exception 'Operations audit delete unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm <> 'ops_audit_events is append-only' then
        raise;
      end if;
  end;
end
$audit_immutable$;

rollback;

\echo Verified Operations owner isolation, negative access, read-only grants, service access, and audit immutability.
