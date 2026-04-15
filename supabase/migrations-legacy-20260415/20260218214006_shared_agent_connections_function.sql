-- Function to get available app connections for an agent
-- Returns the user's own connections UNION owner/admin connections for the agent's team
CREATE OR REPLACE FUNCTION get_agent_available_connections(p_agent_id UUID, p_user_id UUID)
RETURNS TABLE (
  app_id TEXT,
  account_label TEXT,
  connection_user_id UUID,
  is_own_connection BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- User's own connections (marked as own)
  SELECT ac.app_id, ac.account_label, ac.user_id AS connection_user_id, true AS is_own_connection
  FROM app_connections ac
  WHERE ac.user_id = p_user_id

  UNION ALL

  -- Owner/admin connections for the agent's team (excluding user's own to avoid duplicates)
  SELECT ac.app_id, ac.account_label, ac.user_id AS connection_user_id, false AS is_own_connection
  FROM app_connections ac
  JOIN agents a ON a.id = p_agent_id
  JOIN team_members tm ON tm.team_id = a.team_id AND tm.user_id = ac.user_id
  WHERE tm.role IN ('owner', 'admin')
    AND ac.user_id != p_user_id
$$;
