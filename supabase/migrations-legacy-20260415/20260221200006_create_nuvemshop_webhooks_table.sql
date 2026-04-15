-- Nuvemshop webhooks: tracks registered webhooks per store.
CREATE TABLE nuvemshop_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_webhook_id TEXT NOT NULL,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nuvemshop_webhooks_store_id ON nuvemshop_webhooks (store_id);

ALTER TABLE nuvemshop_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view nuvemshop webhooks"
  ON nuvemshop_webhooks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = nuvemshop_webhooks.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on nuvemshop webhooks"
  ON nuvemshop_webhooks FOR ALL
  USING (auth.role() = 'service_role');
