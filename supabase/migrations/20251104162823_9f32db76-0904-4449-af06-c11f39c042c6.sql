-- FASE 1: Adicionar RLS policies para bloqueio automático
DROP POLICY IF EXISTS "Users can only access active subscriptions" ON active_subscriptions;

CREATE POLICY "Users can only access active valid subscriptions"
ON active_subscriptions FOR SELECT
USING (
  auth.uid() = user_id 
  AND status = 'active' 
  AND end_date >= CURRENT_DATE
);

-- FASE 2: Adicionar campos de metadata se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'active_subscriptions' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE active_subscriptions 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- FASE 3: Configurar Cron Jobs usando pg_cron
-- Habilitar extensão pg_cron se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Limpar jobs anteriores se existirem
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid FROM cron.job 
    WHERE jobname IN (
      'check-expired-subscriptions-daily',
      'send-expiry-reminders-daily', 
      'auto-renew-subscriptions-daily'
    )
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $$;

-- Job 1: Verificar assinaturas expiradas (2 AM diariamente)
SELECT cron.schedule(
  'check-expired-subscriptions-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/check-expired-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYm9wa3F6a2F2aG1lbmpsaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMTQsImV4cCI6MjA3MDQ5NzAxNH0.AeqAVWHVqyAn7wxNvHeuQFkJREHUTB9fZP22qpv73d0"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Job 2: Enviar lembretes de expiração (10 AM diariamente)
SELECT cron.schedule(
  'send-expiry-reminders-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/send-expiry-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYm9wa3F6a2F2aG1lbmpsaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMTQsImV4cCI6MjA3MDQ5NzAxNH0.AeqAVWHVqyAn7wxNvHeuQFkJREHUTB9fZP22qpv73d0"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Job 3: Renovar assinaturas automaticamente (12 PM diariamente)
SELECT cron.schedule(
  'auto-renew-subscriptions-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/auto-renew-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxYm9wa3F6a2F2aG1lbmpsaGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjEwMTQsImV4cCI6MjA3MDQ5NzAxNH0.AeqAVWHVqyAn7wxNvHeuQFkJREHUTB9fZP22qpv73d0"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_active_subscriptions_auto_renew 
ON active_subscriptions(auto_renew, end_date) 
WHERE status = 'active' AND auto_renew = true;

CREATE INDEX IF NOT EXISTS idx_active_subscriptions_expiring 
ON active_subscriptions(end_date, status) 
WHERE status = 'active';

-- Comentar tabela plan_subscriptions se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'plan_subscriptions'
  ) THEN
    COMMENT ON TABLE plan_subscriptions IS 
    'DEPRECATED: Use active_subscriptions. Mantida apenas para referência histórica.';
  END IF;
END $$;
