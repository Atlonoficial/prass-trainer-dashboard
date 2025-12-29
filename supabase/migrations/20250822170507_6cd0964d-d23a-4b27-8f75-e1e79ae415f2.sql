-- Corrigir função de presença e contadores (sem alterar IDs existentes)

-- Garantir que a função update_user_presence existe
CREATE OR REPLACE FUNCTION public.update_user_presence(
  is_online_param boolean DEFAULT true,
  typing_in_conversation_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, is_typing_in_conversation, last_seen, updated_at)
  VALUES (auth.uid(), is_online_param, typing_in_conversation_param, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_online = is_online_param,
    is_typing_in_conversation = typing_in_conversation_param,
    last_seen = now(),
    updated_at = now();
END;
$$;

-- Função para incrementar contador de mensagens não lidas automaticamente
CREATE OR REPLACE FUNCTION public.increment_unread_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Incrementar contador baseado no tipo de remetente
  IF NEW.sender_type = 'teacher' THEN
    -- Professor enviou, incrementar contador do aluno
    UPDATE public.conversations 
    SET unread_count_student = COALESCE(unread_count_student, 0) + 1,
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  ELSE
    -- Aluno enviou, incrementar contador do professor
    UPDATE public.conversations 
    SET unread_count_teacher = COALESCE(unread_count_teacher, 0) + 1,
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para incrementar contadores automaticamente
DROP TRIGGER IF EXISTS trigger_increment_unread_counter ON public.chat_messages;
CREATE TRIGGER trigger_increment_unread_counter
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_unread_counter();