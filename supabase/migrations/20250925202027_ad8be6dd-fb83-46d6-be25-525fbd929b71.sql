-- Criar trigger para notificação automática de agendamentos
CREATE OR REPLACE FUNCTION public.notify_student_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  teacher_name text;
  student_user_id uuid;
BEGIN
  -- Buscar nome do professor
  SELECT COALESCE(p.name, p.email, 'Seu Professor') INTO teacher_name
  FROM profiles p 
  WHERE p.id = NEW.teacher_id;

  -- Buscar user_id do estudante
  SELECT s.user_id INTO student_user_id
  FROM students s 
  WHERE s.id = NEW.student_id;

  -- Inserir notificação automática
  INSERT INTO notifications (
    target_users,
    title,
    message,
    type,
    data,
    created_by
  ) VALUES (
    ARRAY[student_user_id],
    'Novo Agendamento',
    'Você tem um novo agendamento: ' || COALESCE(NEW.title, NEW.type, 'Aula') || 
    ' em ' || to_char(NEW.scheduled_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI'),
    'appointment',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'appointment_type', NEW.type,
      'scheduled_time', NEW.scheduled_time,
      'teacher_name', teacher_name,
      'duration', NEW.duration
    ),
    NEW.teacher_id
  );

  -- Tentar enviar push notification via Edge Function
  PERFORM public.pg_notify('appointment_created', 
    json_build_object(
      'student_id', student_user_id,
      'appointment_id', NEW.id,
      'teacher_name', teacher_name,
      'scheduled_time', NEW.scheduled_time,
      'type', NEW.type
    )::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log erro mas não falha o insert
  RAISE WARNING 'Failed to send appointment notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Criar trigger que dispara na criação de agendamentos
DROP TRIGGER IF EXISTS trigger_notify_student_appointment ON appointments;
CREATE TRIGGER trigger_notify_student_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_appointment();

-- Criar função para limpeza de notificações antigas (opcional)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM notifications 
  WHERE created_at < (now() - interval '30 days')
    AND is_read = true;
    
  RAISE NOTICE 'Cleaned old read notifications older than 30 days';
END;
$$;