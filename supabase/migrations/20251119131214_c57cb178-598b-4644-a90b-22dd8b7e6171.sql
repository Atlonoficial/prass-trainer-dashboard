-- Configurar CRON Job para limpeza automática de feedbacks
SELECT cron.schedule(
  'cleanup-feedbacks-hybrid',
  '0 3 * * *', -- Executar diariamente às 3h da manhã
  $$
  SELECT cleanup_feedbacks_hybrid();
  $$
);