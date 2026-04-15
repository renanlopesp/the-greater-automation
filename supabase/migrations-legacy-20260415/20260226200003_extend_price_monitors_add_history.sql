-- Extend store_price_monitors with linking and change detection columns.
ALTER TABLE store_price_monitors
  ADD COLUMN own_product_id UUID REFERENCES store_products(id),
  ADD COLUMN alert_threshold_pct NUMERIC(5,2) DEFAULT 5.0,
  ADD COLUMN workflow_id UUID REFERENCES workflows(id),
  ADD COLUMN previous_price NUMERIC(10,2),
  ADD COLUMN price_changed_at TIMESTAMPTZ;

-- Price history for trend tracking.
CREATE TABLE store_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES store_price_monitors(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_monitor ON store_price_history(monitor_id, scraped_at DESC);

ALTER TABLE store_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view price history"
  ON store_price_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM store_price_monitors spm
    JOIN stores s ON s.id = spm.store_id
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE spm.id = store_price_history.monitor_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on price history"
  ON store_price_history FOR ALL
  USING (auth.role() = 'service_role');
