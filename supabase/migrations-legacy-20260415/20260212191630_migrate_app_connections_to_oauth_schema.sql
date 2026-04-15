-- Migrate app_connections table to OAuth-focused schema

-- Drop old columns
ALTER TABLE app_connections
  DROP COLUMN IF EXISTS app_name,
  DROP COLUMN IF EXISTS app_logo_url,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS credentials;

-- Add new OAuth-specific columns
ALTER TABLE app_connections
  ADD COLUMN app_id TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'oauth2',
  ADD COLUMN access_token TEXT NOT NULL DEFAULT '',
  ADD COLUMN refresh_token TEXT,
  ADD COLUMN token_expires_at TIMESTAMPTZ,
  ADD COLUMN scopes TEXT[],
  ADD COLUMN account_label TEXT,
  ADD COLUMN account_id TEXT,
  ADD COLUMN metadata JSONB DEFAULT '{}';

-- Drop old unique constraint and add new one
ALTER TABLE app_connections DROP CONSTRAINT IF EXISTS app_connections_user_id_team_id_app_name_key;
ALTER TABLE app_connections ADD CONSTRAINT app_connections_user_app_unique UNIQUE (user_id, app_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own connections" ON app_connections;
DROP POLICY IF EXISTS "Users can manage own connections" ON app_connections;

-- Create granular RLS policies
CREATE POLICY "Users can view own connections"
  ON app_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own connections"
  ON app_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON app_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON app_connections FOR DELETE
  USING (auth.uid() = user_id);
