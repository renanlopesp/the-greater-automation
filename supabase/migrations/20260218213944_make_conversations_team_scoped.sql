-- Add created_by column for conversation ownership tracking
ALTER TABLE agent_conversations ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Backfill created_by from existing user_id
UPDATE agent_conversations SET created_by = user_id WHERE created_by IS NULL;

-- Add is_active flag for active conversation tracking
ALTER TABLE agent_conversations ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- Mark the most recent conversation per agent as active
WITH latest AS (
  SELECT DISTINCT ON (agent_id) id
  FROM agent_conversations
  ORDER BY agent_id, updated_at DESC
)
UPDATE agent_conversations SET is_active = true WHERE id IN (SELECT id FROM latest);

-- Make user_id nullable (deprecate but don't drop yet)
ALTER TABLE agent_conversations ALTER COLUMN user_id DROP NOT NULL;
