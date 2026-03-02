-- Store suppliers: supplier registry for e-commerce stores.
CREATE TABLE store_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  lead_time_days INTEGER NOT NULL CHECK (lead_time_days > 0),
  min_order_value NUMERIC(10,2),
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_suppliers_store_id ON store_suppliers (store_id);
CREATE INDEX idx_store_suppliers_active ON store_suppliers (store_id, is_active) WHERE is_active = true;

ALTER TABLE store_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS via store → team_members chain
CREATE POLICY "Team members can view store suppliers"
  ON store_suppliers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_suppliers.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team owners can create store suppliers"
  ON store_suppliers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_suppliers.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Team owners can update store suppliers"
  ON store_suppliers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_suppliers.store_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access on store suppliers"
  ON store_suppliers FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
