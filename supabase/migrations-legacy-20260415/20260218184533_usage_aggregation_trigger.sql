-- Usage aggregation trigger: rolls up workflow_runs usage into the usage table
CREATE OR REPLACE FUNCTION update_team_usage_on_run_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_steps_limit INTEGER;
  v_ai_credits_limit NUMERIC;
BEGIN
  -- Only fire when status transitions to completed or failed
  IF NEW.status NOT IN ('completed', 'failed') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Resolve the team that owns this workflow
  SELECT w.team_id INTO v_team_id
  FROM workflows w
  WHERE w.id = NEW.workflow_id;

  IF v_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve plan limits from the teams -> plans join
  SELECT COALESCE(p.steps_limit, 300), COALESCE(p.ai_credits_limit, 100)
  INTO v_steps_limit, v_ai_credits_limit
  FROM teams t
  LEFT JOIN plans p ON p.id = t.plan_id
  WHERE t.id = v_team_id;

  -- Upsert usage for the current calendar month
  INSERT INTO usage (team_id, period_start, period_end, steps_used, steps_limit, ai_credits_used, ai_credits_limit)
  VALUES (
    v_team_id,
    date_trunc('month', now()),
    (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
    COALESCE(NEW.steps_used, 0),
    v_steps_limit,
    ROUND(COALESCE(NEW.ai_credits_used, 0) / 1000.0, 2),
    v_ai_credits_limit
  )
  ON CONFLICT (team_id, period_start) DO UPDATE SET
    steps_used     = usage.steps_used + COALESCE(NEW.steps_used, 0),
    ai_credits_used = usage.ai_credits_used + ROUND(COALESCE(NEW.ai_credits_used, 0) / 1000.0, 2),
    steps_limit    = v_steps_limit,
    ai_credits_limit = v_ai_credits_limit,
    updated_at     = now();

  RETURN NEW;
END;
$$;

-- Attach trigger to workflow_runs
CREATE TRIGGER trg_update_team_usage_on_run_complete
  AFTER UPDATE ON workflow_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_team_usage_on_run_complete();
