-- App connections
CREATE TABLE app_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  app_logo_url TEXT,
  status connection_status NOT NULL DEFAULT 'disconnected',
  credentials JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, app_name)
);

ALTER TABLE app_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own connections" ON app_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own connections" ON app_connections FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Usage
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  steps_used INTEGER NOT NULL DEFAULT 0 CHECK (steps_used >= 0),
  steps_limit INTEGER NOT NULL DEFAULT 1000 CHECK (steps_limit >= 0),
  ai_credits_used NUMERIC NOT NULL DEFAULT 0 CHECK (ai_credits_used >= 0),
  ai_credits_limit NUMERIC NOT NULL DEFAULT 100 CHECK (ai_credits_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, period_start),
  CHECK (period_end > period_start)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view usage" ON usage FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = usage.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "System can manage usage" ON usage FOR ALL
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = usage.team_id AND team_members.user_id = auth.uid() AND team_members.role = 'owner'));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cron config
CREATE TABLE cron_config (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
