-- Rename agent_skills → agent_workflows
ALTER TABLE agent_skills RENAME TO agent_workflows;

-- Rename agent_skill_runs → agent_workflow_runs
ALTER TABLE agent_skill_runs RENAME TO agent_workflow_runs;

-- Rename column skill_id → workflow_id in agent_workflow_runs
ALTER TABLE agent_workflow_runs RENAME COLUMN skill_id TO workflow_id;

-- Add missing columns to agent_workflow_runs
ALTER TABLE agent_workflow_runs
  ADD COLUMN IF NOT EXISTS event_log_id text,
  ADD COLUMN IF NOT EXISTS pipeline_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_step_index integer DEFAULT 0;

-- Update RLS policies to reference new table names
-- (policies auto-follow the rename, but FK constraint names stay the same — that's fine)
