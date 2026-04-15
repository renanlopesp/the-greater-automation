-- RPC to update agent conversation starters (bypasses PostgREST schema cache)
CREATE OR REPLACE FUNCTION update_agent_starters(agent_id UUID, starters JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents SET conversation_starters = starters WHERE id = agent_id;
END;
$$;
