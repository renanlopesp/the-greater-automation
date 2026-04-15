-- Schedule Nuvemshop product sync cron every 15 minutes
-- Calls /api/nuvemshop/cron to sync all connected Nuvemshop stores
SELECT cron.schedule(
  'nuvemshop_product_sync',
  '*/15 * * * *',
  format(
    $sql$SELECT net.http_get(
      url := %L,
      headers := %L::jsonb
    )$sql$,
    (SELECT value FROM cron_config WHERE key = 'base_url') || '/api/nuvemshop/cron',
    (SELECT jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || value
    )::text FROM cron_config WHERE key = 'cron_secret')
  )
);
