-- Corrigir a função RPC teacher_update_student_profile para resolver problemas de autorização e funcionalidade
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL, 
  p_phone text DEFAULT NULL,
  p_active_plan text DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_membership_status text DEFAULT NULL,
  p_goals text[] DEFAULT NULL,
  p_membership_expiry timestamp with time zone DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  teacher_id_var uuid := auth.uid();
  student_exists boolean := false;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Iniciando update - Teacher: %, Student: %', teacher_id_var, p_student_id;
  
  -- Verificar se o professor está autenticado
  IF teacher_id_var IS NULL THEN
    RAISE EXCEPTION 'Professor não autenticado';
  END IF;

  -- Verificar se o professor é realmente professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = teacher_id_var AND user_type = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Usuário não é um professor';
  END IF;

  -- Verificar se o estudante existe e pertence ao professor
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = p_student_id AND s.teacher_id = teacher_id_var
  ) INTO student_exists;
  
  IF NOT student_exists THEN
    RAISE EXCEPTION 'Estudante não encontrado ou não pertence ao professor';
  END IF;

  -- Atualizar perfil do usuário na tabela profiles se nome ou email foram fornecidos
  IF p_name IS NOT NULL OR p_email IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      updated_at = now()
    WHERE id = p_student_id;
    
    RAISE NOTICE 'Profile atualizado para user_id: %', p_student_id;
  END IF;

  -- Atualizar dados específicos do estudante na tabela students
  UPDATE public.students
  SET 
    active_plan = COALESCE(p_active_plan, active_plan),
    mode = COALESCE(p_mode, mode),
    membership_status = COALESCE(p_membership_status, membership_status),
    goals = COALESCE(p_goals, goals),
    membership_expiry = CASE 
      WHEN p_membership_expiry IS NOT NULL THEN p_membership_expiry
      ELSE membership_expiry
    END,
    updated_at = now()
  WHERE user_id = p_student_id AND teacher_id = teacher_id_var;

  RAISE NOTICE 'Student data atualizado para user_id: %', p_student_id;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro na função teacher_update_student_profile: %', SQLERRM;
  RAISE;
END;
$function$;