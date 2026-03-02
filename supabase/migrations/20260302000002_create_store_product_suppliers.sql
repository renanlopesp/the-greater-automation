-- Store product-supplier links: N:N relationship between products and suppliers.
CREATE TABLE store_product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES store_suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  cost_price NUMERIC(10,2),
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  last_order_at TIMESTAMPTZ,
  last_order_qty INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_id)
);

CREATE INDEX idx_sps_store_id ON store_product_suppliers (store_id);
CREATE INDEX idx_sps_supplier_id ON store_product_suppliers (supplier_id);
CREATE INDEX idx_sps_product_id ON store_product_suppliers (product_id);

ALTER TABLE store_product_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS via store → team_members chain
CREATE POLICY "Team members can view product supplier links"
  ON store_product_suppliers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_product_suppliers.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team owners can manage product supplier links"
  ON store_product_suppliers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_product_suppliers.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access on product supplier links"
  ON store_product_suppliers FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_product_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
