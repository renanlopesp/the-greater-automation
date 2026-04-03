-- Add task_id to conversations and skill_executions

-- Link conversations to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'task_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    CREATE INDEX idx_conversations_task ON conversations(task_id);
  END IF;
END $$;

-- Link skill_executions to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_executions' AND column_name = 'task_id'
  ) THEN
    ALTER TABLE skill_executions ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    CREATE INDEX idx_skill_executions_task ON skill_executions(task_id);
  END IF;
END $$;
