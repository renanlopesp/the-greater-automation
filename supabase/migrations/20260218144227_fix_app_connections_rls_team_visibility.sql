-- Temporarily add team-based visibility for app_connections
-- (This was later reverted in favor of a more targeted workspace_connections policy)
CREATE POLICY "Team members can view team connections"
ON app_connections FOR SELECT
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));
