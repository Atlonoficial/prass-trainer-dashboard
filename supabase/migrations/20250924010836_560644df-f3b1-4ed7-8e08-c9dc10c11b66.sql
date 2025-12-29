-- Limpar versões conflitantes da função teacher_update_student_profile
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid, text, text, text, text, text, text[], text);
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid, text, text, text, text, date, text[], text);

-- Criar versão única e definitiva da função teacher_update_student_profile
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_active_plan TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'standard',
  p_membership_status TEXT DEFAULT 'inactive',
  p_goals TEXT[] DEFAULT '{}',
  p_membership_expiry TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_exists BOOLEAN := FALSE;
  v_updated_student RECORD;
BEGIN
  -- Validar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o usuário é um professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Apenas professores podem atualizar perfis de estudantes';
  END IF;

  v_teacher_id := auth.uid();

  -- Verificar se o estudante existe e pertence ao professor
  SELECT EXISTS(
    SELECT 1 FROM public.students 
    WHERE user_id = p_student_id AND teacher_id = v_teacher_id
  ) INTO v_student_exists;

  IF NOT v_student_exists THEN
    RAISE EXCEPTION 'Estudante não encontrado ou não pertence ao professor atual';
  END IF;

  -- Log da operação
  RAISE NOTICE 'Atualizando estudante ID: %, Nome: %, Professor: %', p_student_id, p_name, v_teacher_id;

  -- Atualizar a tabela students
  UPDATE public.students 
  SET 
    active_plan = CASE 
      WHEN p_active_plan IS NULL OR p_active_plan = '' OR p_active_plan = 'none' 
      THEN NULL 
      ELSE p_active_plan 
    END,
    mode = COALESCE(p_mode, 'standard'),
    membership_status = COALESCE(p_membership_status, 'inactive'),
    goals = COALESCE(p_goals, '{}'),
    membership_expiry = CASE 
      WHEN p_membership_expiry IS NULL OR p_membership_expiry = '' 
      THEN NULL 
      ELSE p_membership_expiry::DATE 
    END,
    updated_at = NOW()
  WHERE user_id = p_student_id AND teacher_id = v_teacher_id;

  -- Atualizar a tabela profiles
  UPDATE public.profiles 
  SET 
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = p_phone,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Verificar se as atualizações foram bem-sucedidas
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar dados do estudante';
  END IF;

  -- Buscar dados atualizados para retorno
  SELECT 
    s.*,
    p.name,
    p.email,
    p.phone
  INTO v_updated_student
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.user_id = p_student_id AND s.teacher_id = v_teacher_id;

  RAISE NOTICE 'Estudante atualizado com sucesso: %', v_updated_student.name;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dados do estudante atualizados com sucesso',
    'student_id', p_student_id,
    'updated_data', row_to_json(v_updated_student)
  );
END;
$$;