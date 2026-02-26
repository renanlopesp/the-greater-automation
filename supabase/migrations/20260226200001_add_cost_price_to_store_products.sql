-- Add cost_price column to store_products for profit margin calculation.
-- Margin is computed at runtime: margin_pct = (price - cost_price) / price * 100
ALTER TABLE store_products ADD COLUMN cost_price NUMERIC(10,2);
