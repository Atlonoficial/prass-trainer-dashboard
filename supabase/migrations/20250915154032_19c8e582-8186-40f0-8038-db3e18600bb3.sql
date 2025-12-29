-- Criar função e trigger para auto-resetar contadores quando professor visualiza mensagens
CREATE OR REPLACE FUNCTION auto_reset_teacher_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma mensagem é marcada como lida e o sender não é o professor
  IF NEW.is_read = true AND OLD.is_read = false AND NEW.sender_type = 'student' THEN
    -- Verificar se ainda há mensagens não lidas do aluno nesta conversa
    UPDATE conversations 
    SET unread_count_teacher = (
      SELECT COUNT(*)
      FROM chat_messages 
      WHERE conversation_id = NEW.conversation_id 
        AND sender_type = 'student'
        AND is_read = false
    ),
    updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar contadores automaticamente
DROP TRIGGER IF EXISTS trigger_auto_reset_teacher_unread ON chat_messages;
CREATE TRIGGER trigger_auto_reset_teacher_unread
  AFTER UPDATE OF is_read ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_reset_teacher_unread_count();

-- Função para incrementar contadores quando nova mensagem é enviada
CREATE OR REPLACE FUNCTION increment_unread_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador baseado no tipo do sender
  IF NEW.sender_type = 'student' THEN
    -- Aluno enviou mensagem - incrementar contador do professor
    UPDATE conversations 
    SET 
      unread_count_teacher = COALESCE(unread_count_teacher, 0) + 1,
      last_message = NEW.message,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'teacher' THEN
    -- Professor enviou mensagem - incrementar contador do aluno
    UPDATE conversations 
    SET 
      unread_count_student = COALESCE(unread_count_student, 0) + 1,
      last_message = NEW.message,
      last_message_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para incrementar contadores
DROP TRIGGER IF EXISTS trigger_increment_unread_counters ON chat_messages;
CREATE TRIGGER trigger_increment_unread_counters
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_counters();

-- Função melhorada para obter estatísticas do chat com cache
CREATE OR REPLACE FUNCTION get_teacher_chat_stats_optimized(teacher_id_param UUID)
RETURNS TABLE(
  conversations_with_teacher_messages INTEGER,
  conversations_with_student_messages INTEGER,
  unread_teacher_messages INTEGER,
  active_students_count INTEGER,
  total_conversations_count INTEGER,
  response_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  result_record RECORD;
BEGIN
  -- Usar uma única query otimizada com agregações
  SELECT
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'teacher' AND DATE(cm.created_at) = today_date 
      THEN cm.conversation_id 
    END)::INTEGER as teacher_conversations_today,
    
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'student' AND DATE(cm.created_at) = today_date 
      THEN cm.conversation_id 
    END)::INTEGER as student_conversations_today,
    
    COALESCE(SUM(c.unread_count_teacher), 0)::INTEGER as unread_count,
    
    COUNT(DISTINCT c.student_id)::INTEGER as total_conversations,
    
    -- Alunos ativos (mensagens nos últimos 5 minutos)
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'student' 
        AND cm.created_at > (NOW() - INTERVAL '5 minutes')
      THEN c.student_id 
    END)::INTEGER as active_count
    
  INTO result_record
  FROM conversations c
  LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
  WHERE c.teacher_id = teacher_id_param 
    AND c.is_active = true;

  -- Calcular taxa de resposta
  WITH response_stats AS (
    SELECT 
      COUNT(DISTINCT CASE 
        WHEN cm.sender_type = 'student' AND DATE(cm.created_at) = today_date 
        THEN cm.conversation_id 
      END) as student_convs,
      COUNT(DISTINCT CASE 
        WHEN cm.sender_type = 'teacher' AND DATE(cm.created_at) = today_date 
        THEN cm.conversation_id 
      END) as teacher_convs
    FROM conversations c
    LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
    WHERE c.teacher_id = teacher_id_param AND c.is_active = true
  )
  SELECT 
    result_record.teacher_conversations_today,
    result_record.student_conversations_today,
    result_record.unread_count,
    result_record.active_count,
    result_record.total_conversations,
    CASE 
      WHEN rs.student_convs > 0 
      THEN ROUND((rs.teacher_convs::NUMERIC / rs.student_convs) * 100, 0)
      ELSE 0 
    END
  INTO 
    conversations_with_teacher_messages,
    conversations_with_student_messages, 
    unread_teacher_messages,
    active_students_count,
    total_conversations_count,
    response_rate
  FROM response_stats rs;

  RETURN QUERY SELECT 
    conversations_with_teacher_messages,
    conversations_with_student_messages,
    unread_teacher_messages,
    active_students_count,
    total_conversations_count,
    response_rate;
END;
$$;