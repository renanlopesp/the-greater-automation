-- Add UPDATE policy for step_test_results (needed for execute endpoint to update running -> success/failed)
CREATE POLICY "Team members can update test results" ON step_test_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workflows w JOIN team_members tm ON tm.team_id = w.team_id
    WHERE w.id = step_test_results.workflow_id AND tm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflows w JOIN team_members tm ON tm.team_id = w.team_id
    WHERE w.id = step_test_results.workflow_id AND tm.user_id = auth.uid()
  ));
