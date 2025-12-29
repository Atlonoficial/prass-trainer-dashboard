-- Atualizar função trigger para permitir auto-compras de professores
CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar amount
  IF NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount > 10000 THEN
    RAISE EXCEPTION 'Invalid payment amount: %', NEW.amount;
  END IF;
  
  -- Verificar se é auto-compra (professor comprando seu próprio plano)
  IF NEW.teacher_id = NEW.student_id THEN
    -- Verificar se o usuário é realmente um professor
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.teacher_id AND user_type = 'teacher'
    ) THEN
      RAISE EXCEPTION 'Invalid auto-purchase: User is not a teacher';
    END IF;
    
    -- Verificar se o plano existe e pertence ao professor
    IF NEW.plan_catalog_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.plan_catalog 
        WHERE id = NEW.plan_catalog_id AND teacher_id = NEW.teacher_id
      ) THEN
        RAISE EXCEPTION 'Invalid auto-purchase: Plan does not belong to teacher';
      END IF;
    END IF;
    
    -- Auto-compra válida, permitir a inserção
    RETURN NEW;
  END IF;
  
  -- Validação normal de relacionamento teacher-student
  IF NOT EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = NEW.student_id 
      AND s.teacher_id = NEW.teacher_id
  ) THEN
    RAISE EXCEPTION 'Invalid teacher-student relationship for transaction';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;