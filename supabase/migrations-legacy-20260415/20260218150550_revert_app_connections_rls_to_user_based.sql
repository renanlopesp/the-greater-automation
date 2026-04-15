-- Revert broad team-based app_connections policy in favor of
-- the more targeted workspace_connections_rls policy added later
DROP POLICY IF EXISTS "Team members can view team connections" ON app_connections;
