-- Stores: central retail entity. One store per team.
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_url TEXT,
  platform_store_id TEXT,
  platform_access_token TEXT,
  priorities TEXT[] NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id)
);

CREATE INDEX idx_stores_team_id ON stores (team_id);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's store
CREATE POLICY "Team members can view store"
  ON stores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members WHERE team_members.team_id = stores.team_id AND team_members.user_id = auth.uid()
  ));

-- Team owners/admins can create store
CREATE POLICY "Team owners can create store"
  ON stores FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_members WHERE team_members.team_id = stores.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')
  ));

-- Team owners/admins can update store
CREATE POLICY "Team owners can update store"
  ON stores FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_members WHERE team_members.team_id = stores.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')
  ));

-- Service role full access (for webhook/sync processing)
CREATE POLICY "Service role full access on stores"
  ON stores FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
