-- Seed demo data function (creates sample agents, workflows, runs for a user)
CREATE OR REPLACE FUNCTION seed_demo_data(user_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_team_id uuid;
  v_agent1_id uuid;
  v_agent2_id uuid;
  v_wf1_id uuid;
  v_wf2_id uuid;
  v_wf3_id uuid;
  v_wf4_id uuid;
  v_wf5_id uuid;
  v_i int;
  v_date timestamptz;
BEGIN
  SELECT team_id INTO v_team_id FROM team_members WHERE user_id = user_uuid LIMIT 1;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'User has no team';
  END IF;

  INSERT INTO agents (team_id, name, description, created_by)
  VALUES (v_team_id, 'Customer Support Agent', 'Handles incoming support tickets.', user_uuid)
  RETURNING id INTO v_agent1_id;

  INSERT INTO agents (team_id, name, description, created_by)
  VALUES (v_team_id, 'Data Pipeline Agent', 'Monitors and syncs data.', user_uuid)
  RETURNING id INTO v_agent2_id;

  INSERT INTO workflows (team_id, name, emoji, description, status, created_by)
  VALUES (v_team_id, 'Email Triage', '📧', 'Categorize emails', 'published', user_uuid) RETURNING id INTO v_wf1_id;
  INSERT INTO workflows (team_id, name, emoji, description, status, created_by)
  VALUES (v_team_id, 'Ticket Response', '🎫', 'Draft AI responses', 'published', user_uuid) RETURNING id INTO v_wf2_id;
  INSERT INTO workflows (team_id, name, emoji, description, status, is_starred, created_by)
  VALUES (v_team_id, 'Data Sync', '🔄', 'Sync CRM data', 'published', true, user_uuid) RETURNING id INTO v_wf3_id;
  INSERT INTO workflows (team_id, name, emoji, description, status, created_by)
  VALUES (v_team_id, 'Weekly Report', '📊', 'Generate reports', 'draft', user_uuid) RETURNING id INTO v_wf4_id;
  INSERT INTO workflows (team_id, name, emoji, description, status, is_starred, created_by)
  VALUES (v_team_id, 'Slack Bot', '💬', 'Send alerts', 'published', true, user_uuid) RETURNING id INTO v_wf5_id;

  INSERT INTO workflow_triggers (workflow_id, type, config) VALUES
    (v_wf1_id, 'webhook', '{"url": "https://hooks.relay.app/email"}'),
    (v_wf2_id, 'manual', '{"run_inputs": []}'),
    (v_wf3_id, 'scheduled', '{"schedule_type": "interval", "interval_value": 1, "interval_unit": "hours"}'),
    (v_wf4_id, 'scheduled', '{"schedule_type": "interval", "interval_value": 7, "interval_unit": "days"}'),
    (v_wf5_id, 'webhook', '{"url": "https://hooks.relay.app/events"}');

  INSERT INTO agent_skills (agent_id, workflow_id, name, last_run_at, run_count) VALUES
    (v_agent1_id, v_wf1_id, 'Email Triage', now() - interval '2 hours', 47),
    (v_agent1_id, v_wf2_id, 'Ticket Response', now() - interval '30 minutes', 128),
    (v_agent2_id, v_wf3_id, 'Data Sync', now() - interval '1 hour', 312),
    (v_agent2_id, v_wf5_id, 'Slack Alerts', now() - interval '4 hours', 89);

  FOR v_i IN 0..180 LOOP
    v_date := now() - (v_i || ' days')::interval;
    IF v_i % 3 = 0 THEN
      INSERT INTO workflow_runs (workflow_id, agent_id, status, steps_used, ai_credits_used, started_at, completed_at) VALUES
        (v_wf1_id, v_agent1_id, 'completed', 3, 1.5, v_date, v_date + interval '45 seconds'),
        (v_wf3_id, v_agent2_id, 'completed', 3, 2.0, v_date + interval '1 hour', v_date + interval '1 hour 30 seconds'),
        (v_wf5_id, v_agent2_id, 'completed', 2, 0.5, v_date + interval '3 hours', v_date + interval '3 hours 15 seconds');
    ELSIF v_i % 7 = 0 THEN
      INSERT INTO workflow_runs (workflow_id, agent_id, status, steps_used, ai_credits_used, started_at, completed_at) VALUES
        (v_wf3_id, v_agent2_id, 'failed', 1, 0.5, v_date, v_date + interval '10 seconds'),
        (v_wf3_id, v_agent2_id, 'completed', 3, 2.0, v_date + interval '5 minutes', v_date + interval '5 minutes 30 seconds');
    ELSIF v_i % 2 = 0 THEN
      INSERT INTO workflow_runs (workflow_id, agent_id, status, steps_used, ai_credits_used, started_at, completed_at) VALUES
        (v_wf1_id, v_agent1_id, 'completed', 3, 1.5, v_date + interval '2 hours', v_date + interval '2 hours 20 seconds');
    END IF;
  END LOOP;

  INSERT INTO workflow_runs (workflow_id, agent_id, status, steps_used, ai_credits_used, started_at) VALUES
    (v_wf2_id, v_agent1_id, 'running', 1, 0.5, now() - interval '30 seconds'),
    (v_wf3_id, v_agent2_id, 'pending', 0, 0, now());

  UPDATE usage SET steps_used = 342, ai_credits_used = 47.50 WHERE team_id = v_team_id;
END;
$$;
