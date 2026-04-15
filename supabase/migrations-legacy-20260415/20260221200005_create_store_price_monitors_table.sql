-- Store price monitors: competitor price monitoring entries.
CREATE TABLE store_price_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  url TEXT,
  last_price NUMERIC(10,2),
  last_checked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_price_monitors_store_id ON store_price_monitors (store_id);

ALTER TABLE store_price_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view price monitors"
  ON store_price_monitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_price_monitors.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team owners can manage price monitors"
  ON store_price_monitors FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_price_monitors.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access on price monitors"
  ON store_price_monitors FOR ALL
  USING (auth.role() = 'service_role');
