-- Remover todas as versões específicas da função
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid, text, text, text, text, timestamp with time zone, text[], text);
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid, text, text, text, text, text, text, text[], text);  
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid, text, text, text, text, text, text, text[], timestamp with time zone);

-- Agora criar a nova versão única
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_active_plan TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'Online',
  p_membership_status TEXT DEFAULT 'inactive',
  p_goals TEXT[] DEFAULT '{}',
  p_membership_expiry TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- Obter ID do professor logado
  v_teacher_id := auth.uid();
  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado');
  END IF;

  -- Verificar se é professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_teacher_id AND user_type = 'teacher'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não é um professor');
  END IF;

  -- Verificar se o estudante pertence ao professor
  IF NOT EXISTS (
    SELECT 1 FROM public.students 
    WHERE user_id = p_student_id AND teacher_id = v_teacher_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Estudante não encontrado ou não pertence ao professor');
  END IF;

  -- Atualizar perfil do usuário
  UPDATE public.profiles 
  SET 
    name = p_name,
    email = p_email,
    phone = p_phone,
    updated_at = NOW()
  WHERE id = p_student_id;

  -- Atualizar dados do estudante
  UPDATE public.students 
  SET 
    active_plan = CASE 
      WHEN p_active_plan IS NULL OR p_active_plan = 'none' THEN NULL 
      ELSE p_active_plan 
    END,
    mode = p_mode,
    membership_status = p_membership_status,
    goals = p_goals,
    membership_expiry = CASE 
      WHEN p_membership_expiry IS NOT NULL AND p_membership_expiry != '' 
      THEN p_membership_expiry::date
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE user_id = p_student_id AND teacher_id = v_teacher_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Estudante atualizado com sucesso',
    'student_id', p_student_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;