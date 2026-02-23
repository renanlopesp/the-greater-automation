-- Store stock alerts: per-product or global stock threshold configs.
CREATE TABLE store_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  threshold INTEGER NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_store_stock_alerts_store_product ON store_stock_alerts (store_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'));

ALTER TABLE store_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view stock alerts"
  ON store_stock_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_stock_alerts.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team owners can manage stock alerts"
  ON store_stock_alerts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_stock_alerts.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access on stock alerts"
  ON store_stock_alerts FOR ALL
  USING (auth.role() = 'service_role');
