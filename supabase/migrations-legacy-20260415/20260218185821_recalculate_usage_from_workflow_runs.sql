-- Recalculate usage.steps_used and usage.ai_credits_used from workflow_runs
-- This is a one-time data migration to fix usage counters after adding the
-- usage aggregation trigger.
UPDATE usage u
SET
  steps_used = COALESCE(agg.total_steps, 0),
  ai_credits_used = COALESCE(agg.total_credits, 0)
FROM (
  SELECT
    a.team_id,
    SUM(wr.steps_used) AS total_steps,
    SUM(wr.ai_credits_used) AS total_credits
  FROM workflow_runs wr
  JOIN agents a ON a.id = wr.agent_id
  WHERE wr.status IN ('completed', 'failed')
  GROUP BY a.team_id
) agg
WHERE u.team_id = agg.team_id;
