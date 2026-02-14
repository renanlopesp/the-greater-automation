-- Phase 1: Real Agent Skills System
-- Adds structured skill definitions and execution tracking

-- 1. Add structured definition columns to agent_skills
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS trigger_config JSONB;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]';
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]';
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'auto'
  CHECK (execution_mode IN ('auto', 'confirm', 'draft'));

-- Extend source check to include 'rule'
ALTER TABLE agent_skills DROP CONSTRAINT IF EXISTS agent_skills_source_check;
ALTER TABLE agent_skills ADD CONSTRAINT agent_skills_source_check
  CHECK (source IN ('manual', 'dynamic', 'rule'));

-- 2. Create agent_skill_runs table for execution tracking
CREATE TABLE agent_skill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','skipped','waiting_confirmation')),
  trigger_data JSONB,
  condition_results JSONB,
  actions_executed JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_skill_runs_skill_id ON agent_skill_runs(skill_id);
CREATE INDEX idx_skill_runs_agent_id ON agent_skill_runs(agent_id);
CREATE INDEX idx_skill_runs_status ON agent_skill_runs(status);
CREATE INDEX idx_skill_runs_created_at ON agent_skill_runs(created_at DESC);

-- Index for webhook token lookups
CREATE INDEX idx_agent_skills_trigger_config ON agent_skills USING gin(trigger_config);

-- 3. RLS policies for agent_skill_runs
ALTER TABLE agent_skill_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view skill runs for their team agents"
  ON agent_skill_runs FOR SELECT
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert skill runs for their team agents"
  ON agent_skill_runs FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update skill runs for their team agents"
  ON agent_skill_runs FOR UPDATE
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to skill runs"
  ON agent_skill_runs FOR ALL
  USING (auth.role() = 'service_role');
