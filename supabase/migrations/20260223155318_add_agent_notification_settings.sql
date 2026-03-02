-- Add notification_settings JSONB column to agents table
-- Stores per-agent notification config: { telegram_enabled, report_hour, bundle_with_daily }
ALTER TABLE agents ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT '{}';
