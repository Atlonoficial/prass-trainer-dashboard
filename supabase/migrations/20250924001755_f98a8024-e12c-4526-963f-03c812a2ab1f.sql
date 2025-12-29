-- FASE 1: NORMALIZAÇÃO DE PLANOS (CRÍTICO)
-- Converter active_plan strings para UUIDs e criar funções de mapeamento

-- Função para mapear nome do plano para UUID
CREATE OR REPLACE FUNCTION public.get_plan_id_by_name(plan_name text, teacher_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_uuid uuid;
BEGIN
  -- Se já é um UUID válido, retorna ele mesmo
  IF plan_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN plan_name::uuid;
  END IF;
  
  -- Buscar UUID pelo nome do plano
  SELECT id INTO plan_uuid
  FROM plan_catalog 
  WHERE name = plan_name 
    AND teacher_id = teacher_id_param
  LIMIT 1;
  
  RETURN plan_uuid;
END;
$$;

-- Função para mapear UUID do plano para nome  
CREATE OR REPLACE FUNCTION public.get_plan_name_by_id(plan_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_name text;
BEGIN
  SELECT name INTO plan_name
  FROM plan_catalog 
  WHERE id = plan_id
  LIMIT 1;
  
  RETURN COALESCE(plan_name, plan_id::text);
END;
$$;

-- Atualizar função teacher_update_student_profile para suportar conversão automática
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_user_id uuid, 
  p_name text DEFAULT NULL::text, 
  p_email text DEFAULT NULL::text, 
  p_active_plan text DEFAULT NULL::text, 
  p_membership_status text DEFAULT NULL::text, 
  p_membership_expiry timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_goals text[] DEFAULT NULL::text[], 
  p_mode text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rows_affected int;
  normalized_plan_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar se o usuário é professor do estudante
  IF NOT public.is_teacher_of(uid, p_student_user_id) THEN
    RAISE EXCEPTION 'Not authorized to update this student';
  END IF;

  -- Normalizar plan_id se fornecido
  IF p_active_plan IS NOT NULL AND p_active_plan != '' THEN
    normalized_plan_id := public.get_plan_id_by_name(p_active_plan, uid);
    RAISE NOTICE 'Plan normalization: % -> %', p_active_plan, normalized_plan_id;
  END IF;

  -- Atualizar perfil se fornecido
  IF p_name IS NOT NULL OR p_email IS NOT NULL THEN
    UPDATE public.profiles
    SET name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        updated_at = NOW()
    WHERE id = p_student_user_id;
  END IF;

  -- Atualizar dados do estudante
  UPDATE public.students s
  SET active_plan = CASE 
                      WHEN p_active_plan IS NOT NULL THEN normalized_plan_id::text
                      ELSE s.active_plan 
                    END,
      membership_status = COALESCE(p_membership_status, s.membership_status),
      membership_expiry = COALESCE(p_membership_expiry, s.membership_expiry),
      goals = COALESCE(p_goals, s.goals),
      mode = COALESCE(p_mode, s.mode),
      updated_at = NOW()
  WHERE s.user_id = p_student_user_id
    AND s.teacher_id = uid;
     
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Student not found or not authorized';
  END IF;

  RAISE NOTICE 'Successfully updated student profile for user %', p_student_user_id;
  
  RETURN 'success';
END; 
$$;