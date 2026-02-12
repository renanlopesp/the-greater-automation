-- workflow_runs: missing DELETE policy (has SELECT, INSERT, UPDATE but not DELETE)
CREATE POLICY "Team owners/admins can delete runs via workflow"
  ON workflow_runs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

-- human_approvals: missing DELETE policy (has SELECT, INSERT, UPDATE but not DELETE)
CREATE POLICY "Team owners/admins can delete approvals via workflow"
  ON human_approvals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = human_approvals.workflow_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );
