-- Add 'waiting' to run_status enum (for paused runs awaiting human input)
ALTER TYPE run_status ADD VALUE IF NOT EXISTS 'waiting';

-- Add 'waiting_for_input' to run_status enum (for individual step status)
ALTER TYPE run_status ADD VALUE IF NOT EXISTS 'waiting_for_input';

CREATE TABLE human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID,
  step_position INTEGER NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'approval',
  assignee_type TEXT NOT NULL DEFAULT 'anyone',
  assignee TEXT,
  prompt TEXT NOT NULL,
  include_context BOOLEAN NOT NULL DEFAULT true,
  context_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  response JSONB,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  timeout_minutes INTEGER DEFAULT 60,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_human_approvals_run_id ON human_approvals(run_id);
CREATE INDEX idx_human_approvals_status ON human_approvals(status);
CREATE INDEX idx_human_approvals_workflow_id ON human_approvals(workflow_id);

-- RLS
ALTER TABLE human_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view approvals"
  ON human_approvals FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = human_approvals.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create approvals"
  ON human_approvals FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = human_approvals.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can respond to approvals"
  ON human_approvals FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = human_approvals.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );
