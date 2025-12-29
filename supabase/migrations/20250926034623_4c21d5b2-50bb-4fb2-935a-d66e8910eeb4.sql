-- =======================
-- CORREÇÃO DO SISTEMA DE COMUNICAÇÃO - Parte 1
-- Drop e recriação da função otimizada
-- =======================

-- Drop da função existente
DROP FUNCTION IF EXISTS get_teacher_chat_stats_optimized(uuid);

-- Função otimizada para estatísticas de chat (substitui get_teacher_chat_stats)
CREATE OR REPLACE FUNCTION get_teacher_chat_stats_optimized(teacher_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  today_start timestamp with time zone := date_trunc('day', now());
  today_end timestamp with time zone := today_start + interval '1 day';
BEGIN
  WITH stats AS (
    SELECT 
      -- Conversas onde o professor respondeu hoje
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM chat_messages cm 
          WHERE cm.conversation_id = c.id 
            AND cm.sender_type = 'teacher' 
            AND cm.created_at >= today_start 
            AND cm.created_at < today_end
        ) THEN c.id 
      END) as conversations_with_teacher_messages,
      
      -- Conversas onde estudantes enviaram mensagens hoje
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM chat_messages cm 
          WHERE cm.conversation_id = c.id 
            AND cm.sender_type = 'student' 
            AND cm.created_at >= today_start 
            AND cm.created_at < today_end
        ) THEN c.id 
      END) as conversations_with_student_messages,
      
      -- Total de mensagens não lidas do professor
      COALESCE(SUM(c.unread_count_teacher), 0) as unread_teacher_messages,
      
      -- Total de conversas
      COUNT(c.id) as total_conversations,
      
      -- Estudantes ativos (com mensagens nos últimos 7 dias)
      COUNT(DISTINCT CASE 
        WHEN c.last_message_at >= (now() - interval '7 days') THEN c.student_id 
      END) as active_students_count,
      
      -- Taxa de resposta (% de conversas com mensagens de estudantes hoje que tiveram resposta do professor)
      CASE 
        WHEN COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM chat_messages cm 
            WHERE cm.conversation_id = c.id 
              AND cm.sender_type = 'student' 
              AND cm.created_at >= today_start 
              AND cm.created_at < today_end
          ) THEN c.id 
        END) > 0 THEN
          ROUND(
            (COUNT(DISTINCT CASE 
              WHEN EXISTS (
                SELECT 1 FROM chat_messages cm_student 
                WHERE cm_student.conversation_id = c.id 
                  AND cm_student.sender_type = 'student' 
                  AND cm_student.created_at >= today_start 
                  AND cm_student.created_at < today_end
              ) AND EXISTS (
                SELECT 1 FROM chat_messages cm_teacher 
                WHERE cm_teacher.conversation_id = c.id 
                  AND cm_teacher.sender_type = 'teacher' 
                  AND cm_teacher.created_at >= today_start 
                  AND cm_teacher.created_at < today_end
              ) THEN c.id 
            END)::numeric / 
            COUNT(DISTINCT CASE 
              WHEN EXISTS (
                SELECT 1 FROM chat_messages cm 
                WHERE cm.conversation_id = c.id 
                  AND cm.sender_type = 'student' 
                  AND cm.created_at >= today_start 
                  AND cm.created_at < today_end
              ) THEN c.id 
            END)::numeric) * 100, 2
          )
        ELSE 0
      END as response_rate
      
    FROM conversations c
    WHERE c.teacher_id = teacher_id_param 
      AND c.is_active = true
  )
  SELECT jsonb_build_object(
    'conversations_with_teacher_messages', conversations_with_teacher_messages,
    'conversations_with_student_messages', conversations_with_student_messages,
    'unread_teacher_messages', unread_teacher_messages,
    'total_conversations_count', total_conversations,
    'active_students_count', active_students_count,
    'response_rate', response_rate
  ) INTO result
  FROM stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;