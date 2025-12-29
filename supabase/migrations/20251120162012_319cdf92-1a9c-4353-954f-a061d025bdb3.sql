-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic points reset check to run every day at 3 AM (Brasília time = 6 AM UTC)
-- This checks for gamification_settings with auto_reset_enabled=true and next_reset_date <= NOW()
SELECT cron.schedule(
  'auto-reset-gamification-points',
  '0 6 * * *', -- 6 AM UTC = 3 AM Brasília (UTC-3)
  $$
  SELECT
    net.http_post(
        url:='https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/check-auto-reset-points',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYm9wa3F6a2F2aG1lbmpsaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMTQsImV4cCI6MjA3MDQ5NzAxNH0.AeqAVWHVqyAn7wxNvHeuQFkJREHUTB9fZP22qpv73d0"}'::jsonb,
        body:=concat('{"executed_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Add comment explaining the CRON job
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled automatic gamification points reset based on teacher configurations';
