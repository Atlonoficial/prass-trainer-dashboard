-- Corrigir função de validação para permitir auto-purchase e melhorar lógica
CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced(
  p_teacher_id uuid,
  p_student_id uuid,
  p_amount numeric,
  p_item_type text,
  p_service_pricing_id uuid DEFAULT NULL,
  p_plan_catalog_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_auto_purchase boolean := false;
  v_teacher_profile RECORD;
  v_student_profile RECORD;
BEGIN
  -- Log para debugging
  RAISE NOTICE 'Validating transaction: teacher=%, student=%, amount=%, type=%', 
    p_teacher_id, p_student_id, p_amount, p_item_type;

  -- Validar entrada básica
  IF p_teacher_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'Teacher ID and Student ID cannot be null';
  END IF;

  -- Validar quantidade
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid payment amount: %', p_amount;
  END IF;

  -- Verificar se é auto-purchase (professor comprando para si mesmo)
  v_is_auto_purchase := (p_teacher_id = p_student_id);
  
  RAISE NOTICE 'Is auto-purchase: %', v_is_auto_purchase;

  -- Verificar se ambos os perfis existem
  SELECT * INTO v_teacher_profile FROM profiles WHERE id = p_teacher_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher profile not found: %', p_teacher_id;
  END IF;

  SELECT * INTO v_student_profile FROM profiles WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found: %', p_student_id;
  END IF;

  -- Validar relacionamento baseado no contexto
  IF v_is_auto_purchase THEN
    -- Auto-purchase: verificar se o usuário é professor
    IF v_teacher_profile.user_type != 'teacher' THEN
      RAISE EXCEPTION 'Auto-purchase only allowed for teachers';
    END IF;
    
    RAISE NOTICE 'Auto-purchase validated for teacher: %', p_teacher_id;
  ELSE
    -- Compra regular: verificar relacionamento professor-aluno
    IF NOT EXISTS (
      SELECT 1 FROM students s 
      WHERE s.user_id = p_student_id 
        AND s.teacher_id = p_teacher_id
    ) THEN
      RAISE EXCEPTION 'Invalid teacher-student relationship for transaction';
    END IF;
    
    RAISE NOTICE 'Teacher-student relationship validated: % -> %', p_teacher_id, p_student_id;
  END IF;

  -- Validar item específico baseado no tipo
  CASE p_item_type
    WHEN 'service' THEN
      IF p_plan_catalog_id IS NULL AND p_service_pricing_id IS NULL THEN
        RAISE EXCEPTION 'Service pricing or plan catalog ID required for service transactions';
      END IF;
      
      -- Verificar se plan existe e pertence ao professor
      IF p_plan_catalog_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM plan_catalog pc 
          WHERE pc.id = p_plan_catalog_id 
            AND pc.teacher_id = p_teacher_id
        ) THEN
          RAISE EXCEPTION 'Plan not found or does not belong to teacher';
        END IF;
      END IF;

    WHEN 'course' THEN
      IF p_course_id IS NULL THEN
        RAISE EXCEPTION 'Course ID required for course transactions';
      END IF;
      
      -- Verificar se curso existe e pertence ao professor
      IF NOT EXISTS (
        SELECT 1 FROM courses c 
        WHERE c.id = p_course_id 
          AND c.instructor = p_teacher_id
      ) THEN
        RAISE EXCEPTION 'Course not found or does not belong to teacher';
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid item type: %', p_item_type;
  END CASE;

  RAISE NOTICE 'Transaction validation successful';
  RETURN true;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Transaction validation failed: %', SQLERRM;
  RAISE;
END;
$function$;

-- Adicionar função para detectar contexto de transação
CREATE OR REPLACE FUNCTION public.get_transaction_context(
  p_authenticated_user_id uuid,
  p_target_student_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_profile RECORD;
  v_result jsonb;
BEGIN
  -- Buscar perfil do usuário autenticado
  SELECT * INTO v_user_profile FROM profiles WHERE id = p_authenticated_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_authenticated_user_id;
  END IF;

  -- Determinar contexto baseado no tipo de usuário
  IF v_user_profile.user_type = 'teacher' THEN
    -- Professor: pode comprar para si ou para aluno específico
    IF p_target_student_id IS NULL OR p_target_student_id = p_authenticated_user_id THEN
      -- Auto-purchase
      v_result := jsonb_build_object(
        'type', 'auto_purchase',
        'teacher_id', p_authenticated_user_id,
        'student_id', p_authenticated_user_id,
        'description', 'Teacher purchasing for themselves'
      );
    ELSE
      -- Compra para aluno específico
      v_result := jsonb_build_object(
        'type', 'teacher_for_student',
        'teacher_id', p_authenticated_user_id,
        'student_id', p_target_student_id,
        'description', 'Teacher purchasing for student'
      );
    END IF;
  ELSE
    -- Aluno: compra para si mesmo
    v_result := jsonb_build_object(
      'type', 'student_purchase',
      'teacher_id', (
        SELECT s.teacher_id FROM students s 
        WHERE s.user_id = p_authenticated_user_id 
        LIMIT 1
      ),
      'student_id', p_authenticated_user_id,
      'description', 'Student purchasing for themselves'
    );
  END IF;

  RETURN v_result;
END;
$function$;