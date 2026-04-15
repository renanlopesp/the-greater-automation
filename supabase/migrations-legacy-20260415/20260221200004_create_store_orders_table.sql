-- Store orders: synced orders for sales reporting.
CREATE TABLE store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  order_number TEXT,
  status TEXT NOT NULL,
  payment_status TEXT,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  customer_name TEXT,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  ordered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_orders_store_id ON store_orders (store_id);
CREATE UNIQUE INDEX idx_store_orders_external_id ON store_orders (store_id, external_id);
CREATE INDEX idx_store_orders_date ON store_orders (store_id, ordered_at);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view store orders"
  ON store_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_orders.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on store orders"
  ON store_orders FOR ALL
  USING (auth.role() = 'service_role');
