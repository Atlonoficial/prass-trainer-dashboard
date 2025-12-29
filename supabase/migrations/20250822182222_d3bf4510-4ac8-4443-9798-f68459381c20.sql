-- Função otimizada para estatísticas de chat corrigidas
CREATE OR REPLACE FUNCTION public.get_teacher_chat_stats(teacher_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_start TIMESTAMPTZ := (today_date::text || ' 00:00:00+00')::timestamptz;
  today_end TIMESTAMPTZ := (today_date::text || ' 23:59:59+00')::timestamptz;
  
  conversations_with_teacher_messages INTEGER := 0;
  conversations_with_student_messages INTEGER := 0;
  unread_teacher_messages INTEGER := 0;
  active_students_count INTEGER := 0;
  total_conversations_count INTEGER := 0;
  response_rate NUMERIC := 0;
BEGIN
  -- 1. Contar conversas únicas onde professor enviou mensagem hoje
  SELECT COUNT(DISTINCT conversation_id) INTO conversations_with_teacher_messages
  FROM chat_messages cm
  JOIN conversations c ON c.id = cm.conversation_id
  WHERE c.teacher_id = teacher_id_param
    AND cm.sender_type = 'teacher'
    AND cm.created_at >= today_start 
    AND cm.created_at <= today_end;

  -- 2. Contar conversas únicas onde alunos enviaram mensagem hoje
  SELECT COUNT(DISTINCT conversation_id) INTO conversations_with_student_messages
  FROM chat_messages cm
  JOIN conversations c ON c.id = cm.conversation_id
  WHERE c.teacher_id = teacher_id_param
    AND cm.sender_type = 'student'
    AND cm.created_at >= today_start 
    AND cm.created_at <= today_end;

  -- 3. Contar mensagens não lidas enviadas pelo professor (que alunos ainda não viram)
  SELECT COUNT(*) INTO unread_teacher_messages
  FROM chat_messages cm
  JOIN conversations c ON c.id = cm.conversation_id
  WHERE c.teacher_id = teacher_id_param
    AND cm.sender_type = 'teacher'
    AND cm.is_read = false;

  -- 4. Contar alunos ativos (online agora)
  SELECT COUNT(DISTINCT s.user_id) INTO active_students_count
  FROM students s
  JOIN user_presence up ON up.user_id = s.user_id
  WHERE s.teacher_id = teacher_id_param
    AND up.is_online = true
    AND up.last_seen >= (NOW() - INTERVAL '5 minutes');

  -- 5. Total de conversas ativas
  SELECT COUNT(*) INTO total_conversations_count
  FROM conversations
  WHERE teacher_id = teacher_id_param
    AND is_active = true;

  -- 6. Calcular taxa de resposta (% de conversas onde professor respondeu)
  IF conversations_with_student_messages > 0 THEN
    response_rate := ROUND((conversations_with_teacher_messages::NUMERIC / conversations_with_student_messages::NUMERIC) * 100, 0);
  ELSE
    response_rate := 0;
  END IF;

  -- Retornar JSON com todas as estatísticas
  RETURN json_build_object(
    'conversations_with_teacher_messages', conversations_with_teacher_messages,
    'conversations_with_student_messages', conversations_with_student_messages,
    'unread_teacher_messages', unread_teacher_messages,
    'active_students_count', active_students_count,
    'total_conversations_count', total_conversations_count,
    'response_rate', response_rate
  );
END;
$function$;