-- Correção de IDs de conversas duplicadas e otimizações do sistema de chat

-- 1. Padronizar IDs de conversas e remover duplicatas
DO $$
DECLARE
    conv_record RECORD;
    standard_id TEXT;
    duplicate_id TEXT;
BEGIN
    -- Encontrar e corrigir conversas com IDs no formato antigo (com underscore)
    FOR conv_record IN 
        SELECT DISTINCT student_id, teacher_id 
        FROM conversations 
        WHERE id LIKE '%_%'
    LOOP
        standard_id := conv_record.teacher_id || '-' || conv_record.student_id;
        duplicate_id := conv_record.teacher_id || '_' || conv_record.student_id;
        
        -- Se já existe conversa com o ID padronizado, mesclar dados
        IF EXISTS (SELECT 1 FROM conversations WHERE id = standard_id) THEN
            -- Mesclar dados da conversa duplicada para a padrão
            UPDATE conversations 
            SET 
                last_message = COALESCE(
                    (SELECT last_message FROM conversations WHERE id = duplicate_id), 
                    last_message
                ),
                last_message_at = GREATEST(
                    COALESCE(last_message_at, '1970-01-01'::timestamptz),
                    COALESCE((SELECT last_message_at FROM conversations WHERE id = duplicate_id), '1970-01-01'::timestamptz)
                ),
                unread_count_teacher = COALESCE(unread_count_teacher, 0) + 
                    COALESCE((SELECT unread_count_teacher FROM conversations WHERE id = duplicate_id), 0),
                unread_count_student = COALESCE(unread_count_student, 0) + 
                    COALESCE((SELECT unread_count_student FROM conversations WHERE id = duplicate_id), 0)
            WHERE id = standard_id;
            
            -- Mover mensagens da conversa duplicada para a padrão
            UPDATE chat_messages 
            SET conversation_id = standard_id 
            WHERE conversation_id = duplicate_id;
            
            -- Remover conversa duplicada
            DELETE FROM conversations WHERE id = duplicate_id;
        ELSE
            -- Apenas atualizar o ID para o formato padrão
            UPDATE conversations 
            SET id = standard_id 
            WHERE id = duplicate_id;
            
            -- Atualizar mensagens para usar o novo ID
            UPDATE chat_messages 
            SET conversation_id = standard_id 
            WHERE conversation_id = duplicate_id;
        END IF;
    END LOOP;
END $$;

-- 2. Criar função otimizada para atualizar contadores de não lidas
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 3. Recriar trigger para contadores (caso não exista)
DROP TRIGGER IF EXISTS trigger_update_conversation_counters ON chat_messages;
CREATE TRIGGER trigger_update_conversation_counters
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_counters();

-- 4. Função para resetar contadores quando mensagens são lidas
CREATE OR REPLACE FUNCTION reset_unread_counter()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 5. Trigger para recalcular contadores quando mensagens são marcadas como lidas
DROP TRIGGER IF EXISTS trigger_reset_unread_counter ON chat_messages;
CREATE TRIGGER trigger_reset_unread_counter
    AFTER UPDATE ON chat_messages
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
    EXECUTE FUNCTION reset_unread_counter();

-- 6. Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_unread 
ON chat_messages(conversation_id, is_read, sender_type);

CREATE INDEX IF NOT EXISTS idx_conversations_teacher_last_message 
ON conversations(teacher_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_presence_user_id 
ON user_presence(user_id);

-- 7. Função para limpar presença antiga (otimização)
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    -- Remove presenças não atualizadas há mais de 1 hora
    DELETE FROM user_presence 
    WHERE last_seen < (now() - interval '1 hour')
    AND is_online = false;
END;
$$ LANGUAGE plpgsql;