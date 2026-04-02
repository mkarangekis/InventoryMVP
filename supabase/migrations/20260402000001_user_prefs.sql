-- User notification preferences (server-synced)
CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants(id) ON DELETE CASCADE,
  variance_alerts     boolean NOT NULL DEFAULT true,
  reorder_alerts      boolean NOT NULL DEFAULT true,
  weekly_digest       boolean NOT NULL DEFAULT true,
  digest_day          text    NOT NULL DEFAULT 'monday',
  alert_threshold     text    NOT NULL DEFAULT 'high',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs" ON user_notification_prefs
  FOR ALL USING (user_id = auth.uid());
