-- Configurar o cron job para limpeza semanal
-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver
SELECT cron.unschedule('weekly-chat-cleanup');

-- Agendar limpeza semanal toda segunda-feira às 02:00
SELECT cron.schedule(
  'weekly-chat-cleanup',
  '0 2 * * 1', -- Toda segunda-feira às 02:00
  $$
  SELECT public.cleanup_weekly_chat_messages();
  $$
);

-- Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'weekly-chat-cleanup';