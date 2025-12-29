-- Função para limpar mensagens de uma conversa específica
CREATE OR REPLACE FUNCTION public.clear_conversation_messages(p_conversation_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Verificar se o usuário é participante da conversa
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id 
    AND (c.teacher_id = uid OR c.student_id = uid)
  ) THEN
    RAISE EXCEPTION 'Não autorizado a limpar esta conversa';
  END IF;

  -- Deletar todas as mensagens da conversa
  DELETE FROM public.chat_messages 
  WHERE conversation_id = p_conversation_id;
  
  -- Resetar counters e última mensagem
  UPDATE public.conversations 
  SET 
    last_message = NULL,
    last_message_at = NULL,
    unread_count_teacher = 0,
    unread_count_student = 0,
    updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;