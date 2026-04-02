-- Webhook endpoints registered by tenants
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url             text NOT NULL,
  description     text,
  secret          text NOT NULL,          -- HMAC-SHA256 signing secret
  events          text[] NOT NULL DEFAULT '{}',  -- e.g. ['variance.flagged', 'po.approved']
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_triggered  timestamptz
);

-- Delivery log for each webhook fire
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'pending',  -- pending | delivered | failed
  http_status     integer,
  response_body   text,
  attempt_count   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  delivered_at    timestamptz
);

-- RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant webhook endpoints" ON webhook_endpoints
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant webhook deliveries" ON webhook_deliveries
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Index for delivery polling
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_status ON webhook_deliveries(status);
