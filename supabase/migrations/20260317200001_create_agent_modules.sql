CREATE TABLE agent_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  module_type text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  required_connections jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_agent_modules_unique ON agent_modules(agent_id, module_type);
CREATE INDEX idx_agent_modules_agent_id ON agent_modules(agent_id);

ALTER TABLE agent_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view modules of their team agents" ON agent_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = agent_modules.agent_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage modules of their team agents" ON agent_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN team_members tm ON tm.team_id = a.team_id
      WHERE a.id = agent_modules.agent_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );
