-- Add sender_id to agent_messages for message attribution
ALTER TABLE agent_messages ADD COLUMN sender_id UUID REFERENCES auth.users(id);

-- Backfill existing user-role messages with user_id from their parent conversation
UPDATE agent_messages am
SET sender_id = ac.user_id
FROM agent_conversations ac
WHERE am.conversation_id = ac.id
  AND am.role = 'user'
  AND am.sender_id IS NULL;
