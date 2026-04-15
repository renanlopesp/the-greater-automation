-- Add missing columns to existing workflow_runs table for execution tracking
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS trigger_type trigger_type,
  ADD COLUMN IF NOT EXISTS trigger_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS error TEXT;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_trigger_type ON workflow_runs(trigger_type);
