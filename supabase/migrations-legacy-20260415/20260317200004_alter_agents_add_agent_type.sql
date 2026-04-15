ALTER TABLE agents ADD COLUMN agent_type text;
-- Unique per team: only one agent of each type per team
CREATE UNIQUE INDEX idx_agents_type_per_team ON agents(team_id, agent_type) WHERE agent_type IS NOT NULL;
