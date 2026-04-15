-- Store products: synced product catalog from connected platform.
CREATE TABLE store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  variants JSONB NOT NULL DEFAULT '[]',
  images TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  external_updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_products_store_id ON store_products (store_id);
CREATE UNIQUE INDEX idx_store_products_external_id ON store_products (store_id, external_id);
CREATE INDEX idx_store_products_low_stock ON store_products (store_id, stock_quantity) WHERE stock_quantity > 0;

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- RLS via store → team_members chain
CREATE POLICY "Team members can view store products"
  ON store_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_products.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team owners can manage store products"
  ON store_products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_products.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access on store products"
  ON store_products FOR ALL
  USING (auth.role() = 'service_role');
