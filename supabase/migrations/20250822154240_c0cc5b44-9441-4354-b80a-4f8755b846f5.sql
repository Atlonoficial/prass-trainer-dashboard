-- Agendar limpeza semanal toda segunda-feira às 02:00
SELECT cron.schedule(
  'weekly-chat-cleanup-v2',
  '0 2 * * 1',
  'SELECT public.cleanup_weekly_chat_messages();'
);