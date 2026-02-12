-- Backfill: create default manual triggers for workflows that don't have one
INSERT INTO workflow_triggers (workflow_id, type, config)
SELECT w.id, 'manual', '{"run_inputs": []}'::jsonb
FROM workflows w
LEFT JOIN workflow_triggers wt ON wt.workflow_id = w.id
WHERE wt.id IS NULL;
