-- Fase 1: Corrigir função de validação de transações
DROP FUNCTION IF EXISTS public.validate_transaction_data_enhanced(uuid,uuid,numeric,text,uuid,uuid,uuid);

CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced(
  p_teacher_id UUID,
  p_student_id UUID, 
  p_amount NUMERIC,
  p_item_type TEXT DEFAULT 'plan',
  p_plan_catalog_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_service_pricing_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validação básica de valor (mínimo R$ 0,50 para Mercado Pago)
  IF p_amount IS NULL OR p_amount < 0.50 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid amount: % (must be between R$ 0,50 and R$ 100.000)', p_amount;
  END IF;

  -- PERMITIR auto-compras de professores (teacher_id = student_id) 
  IF p_teacher_id = p_student_id THEN
    -- Validar se é realmente um professor
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_teacher_id AND user_type = 'teacher'
    ) THEN
      RAISE EXCEPTION 'Only teachers can make auto-purchases';
    END IF;
    
    -- Validar o item baseado no tipo
    CASE p_item_type
      WHEN 'plan' THEN
        IF p_plan_catalog_id IS NULL THEN
          RAISE EXCEPTION 'Plan catalog ID required for plan auto-purchase';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM plan_catalog 
          WHERE id = p_plan_catalog_id AND teacher_id = p_teacher_id AND is_active = true
        ) THEN
          RAISE EXCEPTION 'Invalid or inactive plan for auto-purchase: %', p_plan_catalog_id;
        END IF;
        
      WHEN 'course' THEN
        IF p_course_id IS NULL THEN
          RAISE EXCEPTION 'Course ID required for course auto-purchase';
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM courses 
          WHERE id = p_course_id AND instructor = p_teacher_id AND is_published = true
        ) THEN
          RAISE EXCEPTION 'Invalid or unpublished course for auto-purchase: %', p_course_id;
        END IF;
        
      WHEN 'service' THEN
        IF p_service_pricing_id IS NULL THEN
          RAISE EXCEPTION 'Service pricing ID required for service auto-purchase';
        END IF;
        
      ELSE
        RAISE EXCEPTION 'Invalid item type for auto-purchase: %', p_item_type;
    END CASE;
    
    RETURN true;
  END IF;

  -- Para transações regulares, validar relacionamento teacher-student
  IF NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = p_student_id AND s.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Invalid teacher-student relationship: teacher=%, student=%', p_teacher_id, p_student_id;
  END IF;
  
  -- Validações específicas por tipo de item
  CASE p_item_type
    WHEN 'plan' THEN
      IF p_plan_catalog_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM plan_catalog 
        WHERE id = p_plan_catalog_id AND teacher_id = p_teacher_id AND is_active = true
      ) THEN
        RAISE EXCEPTION 'Invalid or inactive plan: %', p_plan_catalog_id;
      END IF;
      
    WHEN 'course' THEN
      IF p_course_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM courses 
        WHERE id = p_course_id AND instructor = p_teacher_id AND is_published = true
      ) THEN
        RAISE EXCEPTION 'Invalid or unpublished course: %', p_course_id;
      END IF;
  END CASE;
  
  RETURN true;
END;
$$;