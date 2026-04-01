-- RPC: create task + conversation in a single DB round trip (saves ~400ms)
CREATE OR REPLACE FUNCTION create_task_with_conversation(
  p_team_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_initial_message TEXT
) RETURNS TABLE(task_id UUID, conversation_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_conv_id UUID;
BEGIN
  INSERT INTO tasks (team_id, user_id, title, status, initial_message)
  VALUES (p_team_id, p_user_id, p_title, 'active', p_initial_message)
  RETURNING id INTO v_task_id;

  INSERT INTO conversations (team_id, user_id, task_id, title, is_active)
  VALUES (p_team_id, p_user_id, v_task_id, LEFT(p_initial_message, 100), true)
  RETURNING id INTO v_conv_id;

  UPDATE tasks SET conversation_id = v_conv_id WHERE id = v_task_id;

  RETURN QUERY SELECT v_task_id, v_conv_id;
END;
$$;
