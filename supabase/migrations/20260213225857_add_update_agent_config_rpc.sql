-- Comprehensive RPC to update all new agent columns (bypasses PostgREST schema cache)
CREATE OR REPLACE FUNCTION update_agent_config(
  p_agent_id UUID,
  p_system_prompt TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_temperature REAL DEFAULT NULL,
  p_max_tokens INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_conversation_starters JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents SET
    system_prompt = COALESCE(p_system_prompt, system_prompt),
    model = COALESCE(p_model, model),
    temperature = COALESCE(p_temperature, temperature),
    max_tokens = COALESCE(p_max_tokens, max_tokens),
    is_active = COALESCE(p_is_active, is_active),
    status = COALESCE(p_status, status),
    conversation_starters = COALESCE(p_conversation_starters, conversation_starters)
  WHERE id = p_agent_id;
END;
$$;
