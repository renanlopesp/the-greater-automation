-- Step test results table for persisting inline step test outputs (24h TTL)
CREATE TABLE step_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_id UUID,
  step_position INTEGER NOT NULL,
  step_type step_type NOT NULL,
  step_name TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  output JSONB,
  error TEXT,
  duration_ms INTEGER NOT NULL,
  tested_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_step_test_results_workflow ON step_test_results (workflow_id, created_at DESC);
CREATE INDEX idx_step_test_results_expires ON step_test_results (expires_at);

ALTER TABLE step_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view test results" ON step_test_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows w JOIN team_members tm ON tm.team_id = w.team_id
    WHERE w.id = step_test_results.workflow_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert test results" ON step_test_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflows w JOIN team_members tm ON tm.team_id = w.team_id
    WHERE w.id = step_test_results.workflow_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete test results" ON step_test_results FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workflows w JOIN team_members tm ON tm.team_id = w.team_id
    WHERE w.id = step_test_results.workflow_id AND tm.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION cleanup_expired_test_results()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM step_test_results WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
