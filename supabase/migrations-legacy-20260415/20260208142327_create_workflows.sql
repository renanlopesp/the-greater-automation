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

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view workflows" ON workflows FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create workflows" ON workflows FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update workflows" ON workflows FOR UPDATE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team owners/admins can delete workflows" ON workflows FOR DELETE
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = workflows.team_id AND team_members.user_id = auth.uid() AND team_members.role IN ('owner', 'admin')));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Workflow triggers (one per workflow)
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE UNIQUE,
  type trigger_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view triggers via workflow" ON workflow_triggers FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage triggers via workflow" ON workflow_triggers FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view steps via workflow" ON workflow_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage steps via workflow" ON workflow_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
