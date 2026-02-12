-- Fix: teams SELECT policy needs to check team_members, which itself has RLS.
-- Add a direct SELECT policy on teams for the team_members view query.
CREATE POLICY "Team members can view their teams" ON teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()));
