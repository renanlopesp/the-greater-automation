-- Track abandoned cart notifications to avoid duplicates and measure recovery.
CREATE TABLE store_abandoned_cart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  checkout_id BIGINT NOT NULL,
  checkout_total NUMERIC(10,2),
  customer_name TEXT,
  customer_email TEXT,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovered_at TIMESTAMPTZ,
  UNIQUE(store_id, checkout_id)
);

CREATE INDEX idx_abandoned_cart_store ON store_abandoned_cart_notifications(store_id);
CREATE INDEX idx_abandoned_cart_pending ON store_abandoned_cart_notifications(store_id)
  WHERE recovered_at IS NULL;

ALTER TABLE store_abandoned_cart_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view abandoned cart notifications"
  ON store_abandoned_cart_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = store_abandoned_cart_notifications.store_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on abandoned cart notifications"
  ON store_abandoned_cart_notifications FOR ALL
  USING (auth.role() = 'service_role');
