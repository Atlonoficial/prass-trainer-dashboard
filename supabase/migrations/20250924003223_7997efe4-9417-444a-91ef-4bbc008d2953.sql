-- CORREÇÃO CRÍTICA: Criar função RPC teacher_update_student_profile
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_active_plan text DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_membership_status text DEFAULT NULL,
  p_goals text[] DEFAULT NULL,
  p_membership_expiry timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_plan_id uuid;
  v_result jsonb;
BEGIN
  -- Verificar se o usuário é professor do estudante
  IF NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = p_student_id AND s.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'Não autorizado a atualizar este estudante';
  END IF;

  -- Converter nome do plano para UUID se necessário
  IF p_active_plan IS NOT NULL AND p_active_plan != 'none' AND p_active_plan != '' THEN
    -- Se já é UUID, usar diretamente
    IF p_active_plan ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_plan_id := p_active_plan::uuid;
    ELSE
      -- Buscar UUID pelo nome
      SELECT id INTO v_plan_id 
      FROM plan_catalog 
      WHERE name = p_active_plan AND teacher_id = v_teacher_id 
      LIMIT 1;
      
      -- Se não encontrou, manter como string (compatibilidade)
      IF v_plan_id IS NULL THEN
        v_plan_id := NULL;
      END IF;
    END IF;
  END IF;

  -- Atualizar perfil do usuário
  UPDATE profiles SET
    name = COALESCE(p_name, name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE id = p_student_id;

  -- Atualizar dados do estudante
  UPDATE students SET
    active_plan = CASE 
      WHEN p_active_plan = 'none' OR p_active_plan = '' THEN NULL
      WHEN v_plan_id IS NOT NULL THEN v_plan_id::text
      ELSE COALESCE(p_active_plan, active_plan)
    END,
    mode = COALESCE(p_mode, mode),
    membership_status = COALESCE(p_membership_status, membership_status),
    goals = COALESCE(p_goals, goals),
    membership_expiry = COALESCE(p_membership_expiry, membership_expiry),
    updated_at = now()
  WHERE user_id = p_student_id AND teacher_id = v_teacher_id;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Estudante atualizado com sucesso',
    'student_id', p_student_id,
    'plan_id', v_plan_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;