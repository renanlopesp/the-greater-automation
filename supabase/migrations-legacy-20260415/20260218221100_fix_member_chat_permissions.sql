-- Fix 1: Grant execute on RPC to authenticated users
GRANT EXECUTE ON FUNCTION get_agent_available_connections(UUID, UUID) TO authenticated;

-- Fix 2: Drop orphaned old INSERT policy on agent_messages
-- (was never dropped due to name mismatch in migration 20260218213957)
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON agent_messages;

-- Fix 3: Drop orphaned old INSERT policy on agent_conversations
-- (was never dropped due to name mismatch in migration 20260218213957)
DROP POLICY IF EXISTS "Users can insert their own conversations" ON agent_conversations;

-- Fix 4: Drop orphaned old SELECT policy on agent_messages (same name mismatch issue)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON agent_messages;

-- Fix 5: Drop orphaned old UPDATE policy on agent_conversations
DROP POLICY IF EXISTS "Users can update their own conversations" ON agent_conversations;

-- Fix 6: Drop orphaned old DELETE policy on agent_conversations
DROP POLICY IF EXISTS "Users can delete their own conversations" ON agent_conversations;
