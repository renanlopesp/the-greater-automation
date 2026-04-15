-- Schedule hourly cron job for agent reports
-- Calls /api/agents/cron/reports every hour at :00
-- Uses cron_config table for base_url and cron_secret
SELECT cron.schedule(
  'agent_hourly_reports',
  '0 * * * *',
  format(
    $sql$SELECT net.http_post(
      url := %L,
      headers := %L::jsonb,
      body := jsonb_build_object('triggered_at', now()::text)
    )$sql$,
    (SELECT value FROM cron_config WHERE key = 'base_url') || '/api/agents/cron/reports',
    (SELECT jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || value
    )::text FROM cron_config WHERE key = 'cron_secret')
  )
);
