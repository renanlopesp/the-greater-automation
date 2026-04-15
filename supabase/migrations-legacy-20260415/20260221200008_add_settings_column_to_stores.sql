-- Add settings JSONB column to stores for notification preferences and other config
ALTER TABLE stores ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
