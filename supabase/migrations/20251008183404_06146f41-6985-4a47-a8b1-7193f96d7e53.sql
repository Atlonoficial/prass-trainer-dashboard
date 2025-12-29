-- ============================================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE COMUNICAÇÃO
-- ============================================================================

-- ETAPA 1: Criar trigger para auto-incrementar contadores de não lidas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_auto_increment_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type = 'teacher' THEN
    UPDATE conversations
    SET unread_count_student = unread_count_student + 1,
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'student' THEN
    UPDATE conversations
    SET unread_count_teacher = unread_count_teacher + 1,
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_increment_unread_count ON chat_messages;
CREATE TRIGGER auto_increment_unread_count
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_increment_unread_count();

-- ============================================================================
-- ETAPA 2: Corrigir função mark_multiple_conversations_as_read
-- ============================================================================

DROP FUNCTION IF EXISTS public.mark_multiple_conversations_as_read(TEXT[], TEXT);

CREATE OR REPLACE FUNCTION public.mark_multiple_conversations_as_read(
  conversation_ids TEXT[],
  user_type TEXT DEFAULT 'teacher'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv_id TEXT;
BEGIN
  FOREACH conv_id IN ARRAY conversation_ids
  LOOP
    IF user_type = 'teacher' THEN
      UPDATE chat_messages
      SET is_read = true,
          read_at = NOW()
      WHERE conversation_id = conv_id
        AND sender_type = 'student'
        AND is_read = false;
      
      UPDATE conversations
      SET unread_count_teacher = 0,
          updated_at = NOW()
      WHERE id = conv_id;
      
    ELSIF user_type = 'student' THEN
      UPDATE chat_messages
      SET is_read = true,
          read_at = NOW()
      WHERE conversation_id = conv_id
        AND sender_type = 'teacher'
        AND is_read = false;
      
      UPDATE conversations
      SET unread_count_student = 0,
          updated_at = NOW()
      WHERE id = conv_id;
    END IF;
  END LOOP;
END;
$function$;

-- ============================================================================
-- ETAPA 3: Recalcular contadores existentes
-- ============================================================================

UPDATE conversations c
SET unread_count_teacher = (
  SELECT COUNT(*)
  FROM chat_messages m
  WHERE m.conversation_id = c.id
    AND m.sender_type = 'student'
    AND m.is_read = false
),
updated_at = NOW();

UPDATE conversations c
SET unread_count_student = (
  SELECT COUNT(*)
  FROM chat_messages m
  WHERE m.conversation_id = c.id
    AND m.sender_type = 'teacher'
    AND m.is_read = false
),
updated_at = NOW();