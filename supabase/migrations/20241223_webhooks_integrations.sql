-- Add new columns to webhooks table
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS description TEXT;

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(255) PRIMARY KEY,
  webhook_id VARCHAR(255) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('pending', 'success', 'failed'))
);

-- Create indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT integrations_provider_check CHECK (provider IN ('shopify', 'woocommerce', 'stripe', 'custom'))
);

-- Create indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON integrations(is_active);

-- Enable RLS on new tables
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_deliveries (accessible through webhook ownership)
CREATE POLICY "Users can view their webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "Users can insert their webhook deliveries" ON webhook_deliveries
  FOR INSERT WITH CHECK (
    webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.uid()::text)
  );

-- RLS Policies for integrations
CREATE POLICY "Users can view their integrations" ON integrations
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their integrations" ON integrations
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their integrations" ON integrations
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their integrations" ON integrations
  FOR DELETE USING (user_id = auth.uid()::text);

-- Service role policies (for API/webhooks that use service role)
CREATE POLICY "Service role can manage webhook_deliveries" ON webhook_deliveries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage integrations" ON integrations
  FOR ALL USING (true) WITH CHECK (true);
