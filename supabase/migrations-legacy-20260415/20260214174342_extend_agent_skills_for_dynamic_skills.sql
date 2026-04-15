-- Extend agent_skills for dynamic skill creation (Feature 018)
-- Makes workflow_id optional, adds action_template for AI-created skills

-- Make workflow_id optional (dynamic skills don't have a workflow)
ALTER TABLE agent_skills ALTER COLUMN workflow_id DROP NOT NULL;

-- Add action template for dynamic skills
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS action_template JSONB;

-- Add description for better discovery
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS description TEXT;

-- Add source tracking
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'dynamic'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_created
  ON agent_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_user
  ON agent_conversations(agent_id, user_id);

CREATE INDEX IF NOT EXISTS idx_agent_skills_source
  ON agent_skills(agent_id, source);
