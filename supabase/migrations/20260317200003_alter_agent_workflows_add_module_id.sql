ALTER TABLE agent_workflows ADD COLUMN module_id uuid REFERENCES agent_modules(id) ON DELETE SET NULL;
CREATE INDEX idx_agent_workflows_module ON agent_workflows(module_id);
