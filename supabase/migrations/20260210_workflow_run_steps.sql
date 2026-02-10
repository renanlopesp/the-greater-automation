-- Create workflow_run_steps table for tracking individual step execution
-- This table stores the execution state of each step within a workflow run

CREATE TABLE workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID,
  step_position INTEGER NOT NULL,
  step_type step_type NOT NULL,
  status run_status NOT NULL DEFAULT 'pending',
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Index for querying steps by run_id (most common query pattern)
CREATE INDEX idx_run_steps_run_id ON workflow_run_steps(run_id);

-- Index for filtering by status
CREATE INDEX idx_run_steps_status ON workflow_run_steps(status);

-- Enable RLS
ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Team members can view run steps via workflow ownership
CREATE POLICY "Team members can view run steps via workflow"
  ON workflow_run_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_runs
      JOIN workflows ON workflows.id = workflow_runs.workflow_id
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflow_runs.id = workflow_run_steps.run_id
        AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can create run steps via workflow ownership
CREATE POLICY "Team members can create run steps via workflow"
  ON workflow_run_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_runs
      JOIN workflows ON workflows.id = workflow_runs.workflow_id
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflow_runs.id = workflow_run_steps.run_id
        AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can update run steps via workflow ownership
CREATE POLICY "Team members can update run steps via workflow"
  ON workflow_run_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflow_runs
      JOIN workflows ON workflows.id = workflow_runs.workflow_id
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflow_runs.id = workflow_run_steps.run_id
        AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Team members can delete run steps via workflow ownership
CREATE POLICY "Team members can delete run steps via workflow"
  ON workflow_run_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workflow_runs
      JOIN workflows ON workflows.id = workflow_runs.workflow_id
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflow_runs.id = workflow_run_steps.run_id
        AND team_members.user_id = auth.uid()
    )
  );
