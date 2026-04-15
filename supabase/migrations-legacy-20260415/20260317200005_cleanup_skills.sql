-- Add type column to agent_skills table
-- Note: 'knowledge' and 'procedure' types are deprecated.
-- Only 'context' type should be used going forward.
ALTER TABLE agent_skills
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'context';

-- Update any existing rows that may have a null type
UPDATE agent_skills SET type = 'context' WHERE type IS NULL;

-- Add comment explaining deprecation
COMMENT ON COLUMN agent_skills.type IS 'Skill type. Only ''context'' is supported. Values ''knowledge'' and ''procedure'' are deprecated.';
