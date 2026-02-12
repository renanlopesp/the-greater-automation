-- Base schema migration for Relay
-- Creates all enums, tables, functions, triggers, and RLS policies

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE workflow_status AS ENUM ('draft', 'published');
CREATE TYPE trigger_type AS ENUM ('manual', 'scheduled', 'webhook', 'form', 'rss', 'mailhook', 'table', 'mcp', 'app');
CREATE TYPE step_type AS ENUM ('app', 'ai', 'flow_control', 'web_scraping', 'human_in_loop', 'utility', 'http', 'sequence');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create profile row when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- Create a personal team + membership + usage when a profile is created
CREATE OR REPLACE FUNCTION handle_new_user_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_team_id uuid;
  user_name text;
  team_slug text;
BEGIN
  user_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1));
  team_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.teams (name, slug)
  VALUES (user_name || '''s Team', team_slug)
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  INSERT INTO public.usage (team_id, period_start, period_end, steps_used, steps_limit, ai_credits_used, ai_credits_limit)
  VALUES (new_team_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 0, 1000, 0, 100);

  RETURN NEW;
END;
$$;

-- Convert interval config to cron expression
CREATE OR REPLACE FUNCTION interval_to_cron(p_interval_value integer, p_interval_unit text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_interval_unit
    WHEN 'minutes' THEN '*/' || p_interval_value || ' * * * *'
    WHEN 'hours'   THEN '0 */' || p_interval_value || ' * * *'
    WHEN 'days'    THEN '0 0 */' || p_interval_value || ' * *'
    WHEN 'weeks'   THEN '0 0 * * 0'
    ELSE NULL
  END;
END;
$$;

-- Safely unschedule a pg_cron job (ignores if not found)
CREATE OR REPLACE FUNCTION unschedule_cron_job(job_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
EXCEPTION
  WHEN others THEN NULL;
END;
$$;

-- Manage scheduled cron jobs when workflow triggers or workflow status change
CREATE OR REPLACE FUNCTION manage_scheduled_cron_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workflow_id UUID;
  v_job_name TEXT;
  v_cron_expr TEXT;
  v_config JSONB;
  v_workflow_status TEXT;
  v_base_url TEXT;
  v_cron_secret TEXT;
BEGIN
  IF TG_TABLE_NAME = 'workflow_triggers' THEN
    v_workflow_id := COALESCE(NEW.workflow_id, OLD.workflow_id);
  ELSIF TG_TABLE_NAME = 'workflows' THEN
    v_workflow_id := COALESCE(NEW.id, OLD.id);
  END IF;

  v_job_name := 'scheduled_wf_' || v_workflow_id;

  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'workflow_triggers' THEN
    BEGIN
      PERFORM cron.unschedule(v_job_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN OLD;
  END IF;

  SELECT wt.config, w.status
  INTO v_config, v_workflow_status
  FROM workflow_triggers wt
  JOIN workflows w ON w.id = wt.workflow_id
  WHERE wt.workflow_id = v_workflow_id
    AND wt.type = 'scheduled';

  IF v_config IS NULL OR v_workflow_status != 'published' THEN
    BEGIN
      PERFORM cron.unschedule(v_job_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_config->>'schedule_type' = 'cron' THEN
    v_cron_expr := v_config->>'cron_expression';
  ELSE
    v_cron_expr := interval_to_cron(
      (v_config->>'interval_value')::INT,
      v_config->>'interval_unit'
    );
  END IF;

  IF v_cron_expr IS NULL OR v_cron_expr = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT value INTO v_base_url FROM cron_config WHERE key = 'base_url';
  SELECT value INTO v_cron_secret FROM cron_config WHERE key = 'cron_secret';

  BEGIN
    PERFORM cron.unschedule(v_job_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    v_job_name,
    v_cron_expr,
    format(
      $sql$SELECT net.http_post(url := %L, headers := %L::jsonb, body := jsonb_build_object('triggered_at', now()::text))$sql$,
      v_base_url || '/api/workflows/' || v_workflow_id || '/execute-scheduled',
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_cron_secret
      )::text
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members (join table)
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Folders for organizing workflows
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  avatar_type TEXT DEFAULT 'dots',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  palette TEXT NOT NULL DEFAULT 'blue'
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '⚡',
  description TEXT,
  status workflow_status NOT NULL DEFAULT 'draft',
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow triggers (one per workflow)
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE UNIQUE,
  type trigger_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type step_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, position)
);

-- Workflow runs (trigger_type, trigger_data, error added by incremental migration)
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status run_status NOT NULL DEFAULT 'pending',
  steps_used INTEGER NOT NULL DEFAULT 0,
  ai_credits_used NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent skills (link agents to workflows)
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, workflow_id)
);

-- App connections (OAuth tokens etc.)
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

-- Usage tracking per team per billing period
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

-- Cron configuration (base_url, cron_secret)
CREATE TABLE cron_config (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_started_at ON workflow_runs(started_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- teams
CREATE POLICY "Team members can view their teams" ON teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()));
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team owners can update their teams" ON teams FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'owner'));

-- team_members
CREATE POLICY "Users can view own team memberships" ON team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Team owners/admins can insert members" ON team_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));
CREATE POLICY "Team owners/admins can update members" ON team_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));
CREATE POLICY "Team owners/admins can delete members" ON team_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')));

-- folders
CREATE POLICY "Team members can view folders" ON folders FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = folders.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage folders" ON folders FOR ALL
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = folders.team_id AND team_members.user_id = auth.uid()));

-- agents
CREATE POLICY "Team members can view agents" ON agents FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create agents" ON agents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update agents" ON agents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team owners/admins can delete agents" ON agents FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = agents.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')));

-- workflows
CREATE POLICY "Team members can view workflows" ON workflows FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create workflows" ON workflows FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update workflows" ON workflows FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team owners/admins can delete workflows" ON workflows FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')));

-- workflow_triggers
CREATE POLICY "Team members can view triggers via workflow" ON workflow_triggers FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage triggers via workflow" ON workflow_triggers FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()));

-- workflow_steps
CREATE POLICY "Team members can view steps via workflow" ON workflow_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage steps via workflow" ON workflow_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()));

-- workflow_runs
CREATE POLICY "Team members can view runs via workflow" ON workflow_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create runs via workflow" ON workflow_runs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update runs via workflow" ON workflow_runs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));

-- agent_skills
CREATE POLICY "Team members can view skills via agent" ON agent_skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM agents JOIN team_members ON team_members.team_id = agents.team_id WHERE agents.id = agent_skills.agent_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage skills via agent" ON agent_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM agents JOIN team_members ON team_members.team_id = agents.team_id WHERE agents.id = agent_skills.agent_id AND team_members.user_id = auth.uid()));

-- app_connections
CREATE POLICY "Users can view own connections" ON app_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own connections" ON app_connections FOR ALL USING (auth.uid() = user_id);

-- usage
CREATE POLICY "Team members can view usage" ON usage FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = usage.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "System can manage usage" ON usage FOR ALL
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = usage.team_id AND team_members.user_id = auth.uid() AND team_members.role = 'owner'));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auth: auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Profile: auto-create team on profile creation
CREATE TRIGGER on_profile_created_create_team
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_team();

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cron: auto-manage scheduled cron jobs on trigger/workflow changes
CREATE TRIGGER trg_manage_scheduled_cron
  AFTER INSERT OR UPDATE OR DELETE ON workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION manage_scheduled_cron_job();

CREATE TRIGGER trg_manage_scheduled_cron_on_workflow
  AFTER UPDATE OF status ON workflows
  FOR EACH ROW EXECUTE FUNCTION manage_scheduled_cron_job();
