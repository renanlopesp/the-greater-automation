-- Manage scheduled cron jobs when workflow triggers or workflow status change
CREATE OR REPLACE FUNCTION manage_scheduled_cron_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workflow_id UUID;
  v_job_name TEXT;
  v_cron_expr TEXT;
  v_config JSONB;
  v_workflow_status TEXT;
  v_base_url TEXT;
  v_cron_secret TEXT;
BEGIN
  IF TG_TABLE_NAME = 'workflow_triggers' THEN
    v_workflow_id := COALESCE(NEW.workflow_id, OLD.workflow_id);
  ELSIF TG_TABLE_NAME = 'workflows' THEN
    v_workflow_id := COALESCE(NEW.id, OLD.id);
  END IF;

  v_job_name := 'scheduled_wf_' || v_workflow_id;

  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'workflow_triggers' THEN
    BEGIN PERFORM cron.unschedule(v_job_name); EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN OLD;
  END IF;

  SELECT wt.config, w.status INTO v_config, v_workflow_status
  FROM workflow_triggers wt JOIN workflows w ON w.id = wt.workflow_id
  WHERE wt.workflow_id = v_workflow_id AND wt.type = 'scheduled';

  IF v_config IS NULL OR v_workflow_status != 'published' THEN
    BEGIN PERFORM cron.unschedule(v_job_name); EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_config->>'schedule_type' = 'cron' THEN
    v_cron_expr := v_config->>'cron_expression';
  ELSE
    v_cron_expr := interval_to_cron((v_config->>'interval_value')::INT, v_config->>'interval_unit');
  END IF;

  IF v_cron_expr IS NULL OR v_cron_expr = '' THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT value INTO v_base_url FROM cron_config WHERE key = 'base_url';
  SELECT value INTO v_cron_secret FROM cron_config WHERE key = 'cron_secret';

  BEGIN PERFORM cron.unschedule(v_job_name); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    v_job_name, v_cron_expr,
    format(
      $sql$SELECT net.http_post(url := %L, headers := %L::jsonb, body := jsonb_build_object('triggered_at', now()::text))$sql$,
      v_base_url || '/api/workflows/' || v_workflow_id || '/execute-scheduled',
      jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cron_secret)::text
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on workflow_triggers changes
CREATE TRIGGER trg_manage_scheduled_cron
  AFTER INSERT OR UPDATE OR DELETE ON workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION manage_scheduled_cron_job();

-- Trigger on workflow status changes
CREATE TRIGGER trg_manage_scheduled_cron_on_workflow
  AFTER UPDATE OF status ON workflows
  FOR EACH ROW EXECUTE FUNCTION manage_scheduled_cron_job();
