-- Reconcile existing POS import buckets that predate the guarded bucket
-- configuration in 20260422000002_pos_storage_bucket.sql.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'pos-imports',
  'pos-imports',
  false,
  104857600,
  array['text/csv', 'text/plain', 'application/octet-stream']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $verify_pos_imports_bucket$
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
    raise exception 'The pos-imports bucket configuration was not reconciled';
  end if;
end
$verify_pos_imports_bucket$;
