-- Fix: add WITH CHECK clause to workflow_triggers and workflow_steps ALL policies
-- The ALL policies were missing WITH CHECK which prevents inserts

DROP POLICY IF EXISTS "Team members can manage triggers via workflow" ON workflow_triggers;
CREATE POLICY "Team members can manage triggers via workflow" ON workflow_triggers FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_triggers.workflow_id AND team_members.user_id = auth.uid()));

DROP POLICY IF EXISTS "Team members can manage steps via workflow" ON workflow_steps;
CREATE POLICY "Team members can manage steps via workflow" ON workflow_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workflows JOIN team_members ON team_members.team_id = workflows.team_id WHERE workflows.id = workflow_steps.workflow_id AND team_members.user_id = auth.uid()));
