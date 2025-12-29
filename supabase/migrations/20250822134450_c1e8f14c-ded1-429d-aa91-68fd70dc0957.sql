-- Habilitar Realtime para as tabelas de chat
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Adicionar tabela para presença online
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_typing_in_conversation TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS para user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presence" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student presence" ON public.user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s 
      WHERE s.user_id = user_presence.user_id 
      AND s.teacher_id = auth.uid()
    )
  );

-- Função para atualizar presença
CREATE OR REPLACE FUNCTION update_user_presence(
  is_online_param BOOLEAN DEFAULT true,
  typing_in_conversation_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, is_typing_in_conversation, last_seen, updated_at)
  VALUES (auth.uid(), is_online_param, typing_in_conversation_param, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_online = EXCLUDED.is_online,
    is_typing_in_conversation = EXCLUDED.is_typing_in_conversation,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Trigger para limpar typing status após um tempo
CREATE OR REPLACE FUNCTION clear_old_typing_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Limpar status de typing se não foi atualizado há mais de 10 segundos
  UPDATE public.user_presence 
  SET is_typing_in_conversation = NULL, updated_at = now()
  WHERE is_typing_in_conversation IS NOT NULL 
  AND updated_at < (now() - interval '10 seconds');
  
  RETURN NEW;
END;
$$;

-- Adicionar publicação para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;