-- Supabase Storage bucket for POS CSV imports.
-- Objects are private (service role only) and auto-deleted by the webhook after
-- a successful import. They are retained on failure for manual replay.
--
-- Path convention:
--   toast/{YYYY-MM-DD}/{sftp_username}/orders.csv
--   toast/{YYYY-MM-DD}/{sftp_username}/items.csv
--   skytab/{YYYY-MM-DD}/{location_id}/report.csv

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pos-imports',
  'pos-imports',
  false,
  104857600, -- 100 MB per object ceiling (well above any realistic CSV)
  ARRAY['text/csv', 'text/plain', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Only the service role key (used by the SFTP server and Vercel functions) may
-- read or write objects in this bucket. Authenticated end-users have no access.
-- Service role bypasses RLS, so these policies effectively lock out all other roles.
CREATE POLICY "deny authenticated reads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id != 'pos-imports');

CREATE POLICY "deny authenticated writes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id != 'pos-imports');
