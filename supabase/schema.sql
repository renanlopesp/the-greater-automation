-- ============================================================
-- Relay Database Schema
-- ============================================================
-- 6 enum types, 12 tables, RLS policies, indexes, triggers
-- Apply via Supabase SQL Editor or `supabase db reset`
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE workflow_status AS ENUM ('draft', 'published');
CREATE TYPE trigger_type AS ENUM ('manual', 'scheduled', 'webhook', 'form', 'rss', 'mailhook', 'table', 'mcp', 'app');
CREATE TYPE step_type AS ENUM ('app', 'ai', 'flow_control', 'web_scraping', 'human_in_loop', 'utility', 'http', 'sequence');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error');

-- ============================================================
-- SHARED: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update their teams"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. TEAM_MEMBERS
-- ============================================================
CREATE TABLE team_members (
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        team_role NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view memberships of their teams"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can manage memberships"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ============================================================
-- 4. AGENTS
-- ============================================================
CREATE TABLE agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  avatar_url  text,
  avatar_type text DEFAULT 'dots',
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view agents"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create agents"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update agents"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can delete agents"
  ON agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- Index
CREATE INDEX idx_agents_team_id ON agents(team_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. FOLDERS
-- ============================================================
CREATE TABLE folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        text NOT NULL,
  parent_id   uuid REFERENCES folders(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view folders"
  ON folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = folders.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage folders"
  ON folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = folders.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_folders_team_id ON folders(team_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. WORKFLOWS
-- ============================================================
CREATE TABLE workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  folder_id     uuid REFERENCES folders(id) ON DELETE SET NULL,
  name          text NOT NULL,
  emoji         text DEFAULT '⚡',
  description   text,
  status        workflow_status NOT NULL DEFAULT 'draft',
  is_starred    boolean NOT NULL DEFAULT false,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view workflows"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update workflows"
  ON workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can delete workflows"
  ON workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_workflows_team_id ON workflows(team_id);
CREATE INDEX idx_workflows_folder_id ON workflows(folder_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_is_starred ON workflows(team_id, is_starred) WHERE is_starred = true;

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. WORKFLOW_TRIGGERS
-- ============================================================
CREATE TABLE workflow_triggers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL UNIQUE REFERENCES workflows(id) ON DELETE CASCADE,
  type          trigger_type NOT NULL,
  config        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view triggers via workflow"
  ON workflow_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_triggers.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage triggers via workflow"
  ON workflow_triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_triggers.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. WORKFLOW_STEPS
-- ============================================================
CREATE TABLE workflow_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  type          step_type NOT NULL,
  name          text NOT NULL,
  config        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, position)
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view steps via workflow"
  ON workflow_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_steps.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage steps via workflow"
  ON workflow_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_steps.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. AGENT_SKILLS
-- ============================================================
CREATE TABLE agent_skills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workflow_id   uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name          text NOT NULL,
  last_run_at   timestamptz,
  run_count     integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, workflow_id)
);

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view skills via agent"
  ON agent_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN team_members ON team_members.team_id = agents.team_id
      WHERE agents.id = agent_skills.agent_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage skills via agent"
  ON agent_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN team_members ON team_members.team_id = agents.team_id
      WHERE agents.id = agent_skills.agent_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX idx_agent_skills_workflow_id ON agent_skills(workflow_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. WORKFLOW_RUNS
-- ============================================================
CREATE TABLE workflow_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES agents(id) ON DELETE SET NULL,
  status          run_status NOT NULL DEFAULT 'pending',
  steps_used      integer NOT NULL DEFAULT 0,
  ai_credits_used numeric(10,2) NOT NULL DEFAULT 0,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view runs via workflow"
  ON workflow_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create runs via workflow"
  ON workflow_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update runs via workflow"
  ON workflow_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_created_at ON workflow_runs(created_at DESC);

-- ============================================================
-- 11. APP_CONNECTIONS
-- ============================================================
CREATE TABLE app_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  app_name      text NOT NULL,
  app_logo_url  text,
  status        connection_status NOT NULL DEFAULT 'disconnected',
  credentials   jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, app_name)
);

ALTER TABLE app_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON app_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connections"
  ON app_connections FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_app_connections_user_id ON app_connections(user_id);
CREATE INDEX idx_app_connections_team_id ON app_connections(team_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. USAGE
-- ============================================================
CREATE TABLE usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  steps_used      integer NOT NULL DEFAULT 0,
  steps_limit     integer NOT NULL DEFAULT 1000,
  ai_credits_used numeric(10,2) NOT NULL DEFAULT 0,
  ai_credits_limit numeric(10,2) NOT NULL DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, period_start),
  CHECK (period_end > period_start),
  CHECK (steps_used >= 0),
  CHECK (steps_limit >= 0),
  CHECK (ai_credits_used >= 0),
  CHECK (ai_credits_limit >= 0)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view usage"
  ON usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = usage.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage usage"
  ON usage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = usage.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
    )
  );

-- Indexes
CREATE INDEX idx_usage_team_id ON usage(team_id);
CREATE INDEX idx_usage_period ON usage(team_id, period_start, period_end);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
