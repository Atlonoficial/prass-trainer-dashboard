-- Corrigir função de validação - remover função com assinatura específica
DROP FUNCTION IF EXISTS public.validate_transaction_data_enhanced(uuid, uuid, numeric, text, uuid, uuid, uuid) CASCADE;

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
SET search_path = public
AS $$
BEGIN
  -- Validação básica
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount;
  END IF;

  -- PERMITIR auto-compra de professores (teacher_id = student_id)  
  IF p_teacher_id = p_student_id THEN
    RETURN true;
  END IF;

  -- Para outros casos, validar relacionamento teacher-student
  IF NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = p_student_id 
      AND s.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Invalid teacher-student relationship for transaction';
  END IF;
  
  RETURN true;
END;
$$;