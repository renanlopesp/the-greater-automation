-- Add RLS policy for workspace connections visibility (Pro+ feature)
-- Team members can view all connections within their team
CREATE POLICY "Team members can view workspace connections"
ON app_connections FOR SELECT
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));
