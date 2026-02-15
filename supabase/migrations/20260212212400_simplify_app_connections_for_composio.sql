-- Migrate app_connections to Composio-managed OAuth
-- Removes token storage columns (Composio handles tokens)
-- Adds composio_connection_id for linking to Composio

-- Add the new Composio column
ALTER TABLE app_connections
  ADD COLUMN IF NOT EXISTS composio_connection_id TEXT;

-- Drop columns that Composio now manages
ALTER TABLE app_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS token_expires_at,
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS scopes;
