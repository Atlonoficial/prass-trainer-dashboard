-- Drop e recriar função RPC com correções completas
DROP FUNCTION IF EXISTS public.teacher_update_student_profile(uuid,text,text,text,text,text,text,text[],timestamp with time zone);

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
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_plan_uuid uuid := NULL;
BEGIN
  -- Verificar se o usuário logado é professor deste estudante
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = p_student_id 
    AND s.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'Não autorizado a atualizar este estudante';
  END IF;

  -- Converter plano para UUID se necessário
  IF p_active_plan IS NOT NULL AND p_active_plan != 'none' THEN
    -- Primeiro tentar como UUID
    BEGIN
      v_plan_uuid := p_active_plan::uuid;
    EXCEPTION WHEN others THEN
      -- Se não for UUID, buscar por nome na tabela de planos
      SELECT id INTO v_plan_uuid
      FROM plan_catalog 
      WHERE name = p_active_plan 
      AND teacher_id = v_teacher_id
      AND is_active = true
      LIMIT 1;
    END;
  END IF;

  -- Atualizar perfil do usuário na tabela profiles se existe
  UPDATE profiles 
  SET 
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE id = p_student_id;

  -- Atualizar dados do estudante
  UPDATE students 
  SET 
    active_plan = COALESCE(v_plan_uuid, active_plan),
    mode = COALESCE(p_mode, mode),
    membership_status = COALESCE(p_membership_status, membership_status),
    goals = COALESCE(p_goals, goals),
    membership_expiry = COALESCE(p_membership_expiry, membership_expiry),
    updated_at = now()
  WHERE user_id = p_student_id AND teacher_id = v_teacher_id;

  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estudante não encontrado ou não autorizado';
  END IF;

  RETURN true;
END;
$$;