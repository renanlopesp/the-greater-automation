CREATE TABLE workflow_run_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE CASCADE,
  module_id uuid REFERENCES agent_modules(id) ON DELETE CASCADE,
  output_type text NOT NULL,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wro_module_created ON workflow_run_outputs(module_id, created_at DESC);
CREATE INDEX idx_wro_workflow_run ON workflow_run_outputs(workflow_run_id);

ALTER TABLE workflow_run_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outputs of their team modules" ON workflow_run_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_modules am
      JOIN agents a ON a.id = am.agent_id
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE am.id = workflow_run_outputs.module_id
      AND tm.user_id = auth.uid()
    )
  );
