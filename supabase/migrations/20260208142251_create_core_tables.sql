-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team owners can update their teams" ON teams FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'owner'));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Team members
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own team memberships" ON team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Team owners/admins can insert members" ON team_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));
CREATE POLICY "Team owners/admins can update members" ON team_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));
CREATE POLICY "Team owners/admins can delete members" ON team_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));
