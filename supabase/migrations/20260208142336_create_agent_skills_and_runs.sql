-- Agent skills
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

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view skills via agent" ON agent_skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM agents JOIN team_members ON team_members.team_id = agents.team_id WHERE agents.id = agent_skills.agent_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can manage skills via agent" ON agent_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM agents JOIN team_members ON team_members.team_id = agents.team_id WHERE agents.id = agent_skills.agent_id AND team_members.user_id = auth.uid()));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Workflow runs (base columns only — trigger_type, trigger_data, error added later)
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

CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_started_at ON workflow_runs(started_at);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view runs via workflow" ON workflow_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can create runs via workflow" ON workflow_runs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));
CREATE POLICY "Team members can update runs via workflow" ON workflow_runs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_runs.workflow_id AND team_members.user_id = auth.uid()));
