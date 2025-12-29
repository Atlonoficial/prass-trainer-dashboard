-- Função para limpeza semanal de mensagens antigas
CREATE OR REPLACE FUNCTION public.cleanup_weekly_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Apagar mensagens com mais de 7 dias
  DELETE FROM public.chat_messages 
  WHERE created_at < (now() - interval '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  RAISE NOTICE 'Weekly chat cleanup completed: % messages deleted', deleted_count;
  
  -- Inserir log de auditoria
  INSERT INTO public.audit_log (table_name, access_type, record_id)
  VALUES ('chat_messages', 'WEEKLY_CLEANUP', gen_random_uuid());
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during weekly chat cleanup: %', SQLERRM;
END;
$function$;

-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar limpeza semanal toda segunda-feira às 02:00
SELECT cron.schedule(
  'weekly-chat-cleanup',
  '0 2 * * 1', -- Toda segunda-feira às 02:00
  $$
  SELECT public.cleanup_weekly_chat_messages();
  $$
);

-- Função para otimizar performance de mensagens
CREATE OR REPLACE FUNCTION public.optimize_chat_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar índices otimizados se não existirem
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_conversation_created') THEN
    CREATE INDEX idx_chat_messages_conversation_created 
    ON public.chat_messages (conversation_id, created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_sender_created') THEN
    CREATE INDEX idx_chat_messages_sender_created 
    ON public.chat_messages (sender_id, created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_teacher_last_message') THEN
    CREATE INDEX idx_conversations_teacher_last_message 
    ON public.conversations (teacher_id, last_message_at DESC NULLS LAST);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_student_last_message') THEN
    CREATE INDEX idx_conversations_student_last_message 
    ON public.conversations (student_id, last_message_at DESC NULLS LAST);
  END IF;
  
  -- Atualizar estatísticas das tabelas
  ANALYZE public.chat_messages;
  ANALYZE public.conversations;
  
  RAISE NOTICE 'Chat performance optimization completed';
END;
$function$;

-- Executar otimização inicial
SELECT public.optimize_chat_performance();

-- Habilitar Realtime para as tabelas de chat
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

-- Adicionar as tabelas ao canal realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;