-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view folders" ON folders FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = folders.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage folders" ON folders FOR ALL
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = folders.team_id AND team_members.user_id = auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Agents (without palette column — added later)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  avatar_type TEXT DEFAULT 'dots',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view agents" ON agents FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create agents" ON agents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update agents" ON agents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team owners/admins can delete agents" ON agents FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
