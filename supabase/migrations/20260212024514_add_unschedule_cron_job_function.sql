-- Safely unschedule a pg_cron job (ignores if job not found)
CREATE OR REPLACE FUNCTION unschedule_cron_job(job_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
EXCEPTION
  WHEN others THEN NULL;
END;
$$;
