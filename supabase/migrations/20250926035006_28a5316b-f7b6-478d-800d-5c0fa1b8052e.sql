-- =======================
-- CORREÇÃO DO SISTEMA DE COMUNICAÇÃO - Parte 2
-- Implementação de triggers para auto-gestão de contadores
-- =======================

-- 1. Função para auto-incrementar contadores quando nova mensagem é inserida
CREATE OR REPLACE FUNCTION auto_increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador do destinatário baseado no tipo de remetente
  IF NEW.sender_type = 'student' THEN
    -- Mensagem de estudante para professor - incrementar contador do professor
    UPDATE conversations 
    SET 
      unread_count_teacher = unread_count_teacher + 1,
      last_message = NEW.message,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'teacher' THEN
    -- Mensagem de professor para estudante - incrementar contador do estudante
    UPDATE conversations 
    SET 
      unread_count_student = unread_count_student + 1,
      last_message = NEW.message,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Função para auto-resetar contadores quando mensagens são marcadas como lidas
CREATE OR REPLACE FUNCTION auto_reset_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record RECORD;
BEGIN
  -- Só processar se is_read mudou de false para true
  IF OLD.is_read = false AND NEW.is_read = true THEN
    
    -- Buscar informações da conversa
    SELECT * INTO conversation_record
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    IF FOUND THEN
      -- Se a mensagem era de um estudante e foi marcada como lida, resetar contador do professor
      IF NEW.sender_type = 'student' THEN
        -- Verificar se ainda há mensagens não lidas de estudantes nesta conversa
        IF NOT EXISTS (
          SELECT 1 FROM chat_messages 
          WHERE conversation_id = NEW.conversation_id 
            AND sender_type = 'student' 
            AND is_read = false
            AND id != NEW.id
        ) THEN
          UPDATE conversations 
          SET unread_count_teacher = 0
          WHERE id = NEW.conversation_id;
        END IF;
        
      -- Se a mensagem era de um professor e foi marcada como lida, resetar contador do estudante
      ELSIF NEW.sender_type = 'teacher' THEN
        -- Verificar se ainda há mensagens não lidas de professores nesta conversa
        IF NOT EXISTS (
          SELECT 1 FROM chat_messages 
          WHERE conversation_id = NEW.conversation_id 
            AND sender_type = 'teacher' 
            AND is_read = false
            AND id != NEW.id
        ) THEN
          UPDATE conversations 
          SET unread_count_student = 0
          WHERE id = NEW.conversation_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Função RPC otimizada para marcar múltiplas conversas como lidas
CREATE OR REPLACE FUNCTION mark_multiple_conversations_as_read(
  conversation_ids text[],
  user_type text DEFAULT 'teacher'
)
RETURNS jsonb AS $$
DECLARE
  affected_conversations int := 0;
  conv_id text;
BEGIN
  -- Validar user_type
  IF user_type NOT IN ('teacher', 'student') THEN
    RAISE EXCEPTION 'Invalid user_type. Must be teacher or student';
  END IF;

  -- Processar cada conversa
  FOREACH conv_id IN ARRAY conversation_ids LOOP
    -- Marcar mensagens como lidas baseado no tipo de usuário
    IF user_type = 'teacher' THEN
      -- Professor marcando mensagens de estudantes como lidas
      UPDATE chat_messages 
      SET is_read = true 
      WHERE conversation_id = conv_id 
        AND sender_type = 'student' 
        AND is_read = false;
      
      -- Resetar contador do professor
      UPDATE conversations 
      SET unread_count_teacher = 0 
      WHERE id = conv_id;
      
    ELSIF user_type = 'student' THEN
      -- Estudante marcando mensagens de professores como lidas
      UPDATE chat_messages 
      SET is_read = true 
      WHERE conversation_id = conv_id 
        AND sender_type = 'teacher' 
        AND is_read = false;
      
      -- Resetar contador do estudante
      UPDATE conversations 
      SET unread_count_student = 0 
      WHERE id = conv_id;
    END IF;
    
    affected_conversations := affected_conversations + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'affected_conversations', affected_conversations,
    'message', format('Marked %s conversations as read', affected_conversations)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Criar triggers
DROP TRIGGER IF EXISTS trigger_auto_increment_unread_count ON chat_messages;
CREATE TRIGGER trigger_auto_increment_unread_count
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_unread_count();

DROP TRIGGER IF EXISTS trigger_auto_reset_unread_count ON chat_messages;  
CREATE TRIGGER trigger_auto_reset_unread_count
  AFTER UPDATE OF is_read ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_reset_unread_count();