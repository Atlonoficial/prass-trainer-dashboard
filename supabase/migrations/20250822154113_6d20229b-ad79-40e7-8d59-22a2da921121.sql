-- Criar tabela user_presence se não existir
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  is_typing_in_conversation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar índices para user_presence
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence (user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON public.user_presence (is_online);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence (last_seen);

-- Habilitar RLS na tabela user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_presence
CREATE POLICY "Users can manage own presence" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All users can view presence" ON public.user_presence
  FOR SELECT USING (true);

-- Função para atualizar presença do usuário
CREATE OR REPLACE FUNCTION public.update_user_presence(is_online boolean DEFAULT true, typing_in_conversation text DEFAULT null)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, last_seen, is_typing_in_conversation)
  VALUES (auth.uid(), is_online, now(), typing_in_conversation)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_online = EXCLUDED.is_online,
    last_seen = EXCLUDED.last_seen,
    is_typing_in_conversation = EXCLUDED.is_typing_in_conversation,
    updated_at = now();
END;
$function$;

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
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during weekly chat cleanup: %', SQLERRM;
END;
$function$;

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