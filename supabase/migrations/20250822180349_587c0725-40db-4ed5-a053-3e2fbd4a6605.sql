-- Corrigir warnings de segurança das novas funções criadas

-- 1. Corrigir função update_conversation_counters com search_path
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Atualizar última mensagem e contadores
    UPDATE conversations 
    SET 
        last_message = NEW.message,
        last_message_at = NEW.created_at,
        -- Incrementar contador apenas para o destinatário
        unread_count_teacher = CASE 
            WHEN NEW.sender_type = 'student' THEN COALESCE(unread_count_teacher, 0) + 1 
            ELSE unread_count_teacher 
        END,
        unread_count_student = CASE 
            WHEN NEW.sender_type = 'teacher' THEN COALESCE(unread_count_student, 0) + 1 
            ELSE unread_count_student 
        END,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$;

-- 2. Corrigir função reset_unread_counter com search_path
CREATE OR REPLACE FUNCTION reset_unread_counter()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Se a mensagem foi marcada como lida
    IF OLD.is_read = false AND NEW.is_read = true THEN
        -- Recalcular contadores baseado em mensagens não lidas restantes
        UPDATE conversations 
        SET 
            unread_count_teacher = (
                SELECT COUNT(*) 
                FROM chat_messages 
                WHERE conversation_id = NEW.conversation_id 
                AND sender_type = 'student' 
                AND is_read = false
            ),
            unread_count_student = (
                SELECT COUNT(*) 
                FROM chat_messages 
                WHERE conversation_id = NEW.conversation_id 
                AND sender_type = 'teacher' 
                AND is_read = false
            )
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Corrigir função cleanup_old_presence com search_path
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Remove presenças não atualizadas há mais de 1 hora
    DELETE FROM user_presence 
    WHERE last_seen < (now() - interval '1 hour')
    AND is_online = false;
END;
$$;