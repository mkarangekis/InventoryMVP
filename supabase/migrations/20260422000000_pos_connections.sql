-- POS integration connections table
-- Tracks Toast (SFTP), SkyTab (email), and Square (OAuth) connections per location

CREATE TABLE IF NOT EXISTS pos_connections (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  location_id             uuid        NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
  pos_type                text        NOT NULL CHECK (pos_type IN ('toast', 'skytab', 'square')),
  status                  text        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'active', 'error', 'disconnected')),

  -- Toast SFTP credentials (owner enters these into Toast Hub)
  sftp_username           text        UNIQUE,
  sftp_path               text,
  sftp_password           text,

  -- SkyTab email ingest (owner subscribes to this email in Lighthouse)
  ingest_email            text        UNIQUE,

  -- Square OAuth tokens (encrypted at application layer)
  square_merchant_id      text,
  square_access_token     text,
  square_refresh_token    text,
  square_location_id      text,
  square_token_expires_at timestamptz,

  -- Import status tracking
  last_file_received_at   timestamptz,
  last_import_at          timestamptz,
  last_error              text,
  files_received_total    integer     NOT NULL DEFAULT 0,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (location_id, pos_type)
);

CREATE INDEX IF NOT EXISTS pos_connections_location_idx
  ON pos_connections (location_id);

CREATE INDEX IF NOT EXISTS pos_connections_tenant_idx
  ON pos_connections (tenant_id);

CREATE INDEX IF NOT EXISTS pos_connections_sftp_username_idx
  ON pos_connections (sftp_username)
  WHERE sftp_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS pos_connections_ingest_email_idx
  ON pos_connections (ingest_email)
  WHERE ingest_email IS NOT NULL;

-- RLS: users can only see connections for their own locations
ALTER TABLE pos_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own pos_connections" ON pos_connections
  FOR SELECT USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users manage own pos_connections" ON pos_connections
  FOR ALL USING (
    location_id IN (
      SELECT location_id FROM user_locations WHERE user_id = auth.uid()
    )
  );
