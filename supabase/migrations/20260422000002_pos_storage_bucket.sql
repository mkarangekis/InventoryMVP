-- Supabase Storage bucket for POS CSV imports.
-- Objects are private. The service_role key (used by SFTP server + Vercel functions)
-- bypasses RLS entirely, so no additional policies are needed.
-- Objects are deleted by the webhook on successful import; retained on failure for replay.
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
  104857600, -- 100 MB per object ceiling
  ARRAY['text/csv', 'text/plain', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;
