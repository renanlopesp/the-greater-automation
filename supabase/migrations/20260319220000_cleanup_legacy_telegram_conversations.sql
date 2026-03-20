-- Cleanup legacy Telegram conversations that were incorrectly created under
-- non-orchestrator agents. These conversations have a title matching 'Telegram%'
-- and belong to agents where is_orchestrator = false.

-- Delete messages first (FK constraint)
DELETE FROM agent_messages
WHERE conversation_id IN (
  SELECT ac.id
  FROM agent_conversations ac
  JOIN agents a ON a.id = ac.agent_id
  WHERE ac.title LIKE 'Telegram%'
    AND a.is_orchestrator = false
);

-- Then delete the conversations
DELETE FROM agent_conversations
WHERE id IN (
  SELECT ac.id
  FROM agent_conversations ac
  JOIN agents a ON a.id = ac.agent_id
  WHERE ac.title LIKE 'Telegram%'
    AND a.is_orchestrator = false
);
