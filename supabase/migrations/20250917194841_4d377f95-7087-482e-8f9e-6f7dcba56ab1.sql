-- Adicionar campos de gestão de tempo e status para treinos e dietas

-- Adicionar campos na tabela workouts (treinos)
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'archived')),
ADD COLUMN IF NOT EXISTS auto_expire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT false;

-- Adicionar campos na tabela nutrition_plans (dietas)
ALTER TABLE public.nutrition_plans 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'archived')),
ADD COLUMN IF NOT EXISTS auto_expire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT false;

-- Função para calcular status baseado em datas
CREATE OR REPLACE FUNCTION public.calculate_plan_status(
  p_start_date DATE,
  p_end_date DATE,
  p_current_status TEXT,
  p_auto_expire BOOLEAN DEFAULT false
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se não tem datas definidas, manter status atual
  IF p_start_date IS NULL AND p_end_date IS NULL THEN
    RETURN COALESCE(p_current_status, 'active');
  END IF;
  
  -- Se tem data de início e ainda não começou
  IF p_start_date IS NOT NULL AND p_start_date > CURRENT_DATE THEN
    RETURN 'inactive';
  END IF;
  
  -- Se tem data de fim e já expirou
  IF p_end_date IS NOT NULL AND p_end_date < CURRENT_DATE THEN
    IF p_auto_expire = true THEN
      RETURN 'expired';
    ELSE
      RETURN COALESCE(p_current_status, 'active');
    END IF;
  END IF;
  
  -- Se está dentro do período válido
  IF (p_start_date IS NULL OR p_start_date <= CURRENT_DATE) 
     AND (p_end_date IS NULL OR p_end_date >= CURRENT_DATE) THEN
    RETURN 'active';
  END IF;
  
  -- Fallback para status atual
  RETURN COALESCE(p_current_status, 'active');
END;
$$;

-- Função para exclusão segura de treinos
CREATE OR REPLACE FUNCTION public.safe_delete_workout(p_workout_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workout_exists BOOLEAN;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o treino existe e pertence ao usuário
  SELECT EXISTS (
    SELECT 1 FROM workouts 
    WHERE id = p_workout_id 
    AND created_by = v_user_id
  ) INTO v_workout_exists;
  
  IF NOT v_workout_exists THEN
    RAISE EXCEPTION 'Treino não encontrado ou acesso negado';
  END IF;
  
  -- Realizar exclusão com limpeza de dados
  DELETE FROM workouts 
  WHERE id = p_workout_id 
  AND created_by = v_user_id;
  
  -- Log da ação
  INSERT INTO audit_log (user_id, table_name, record_id, access_type)
  VALUES (v_user_id, 'workouts', p_workout_id, 'DELETE');
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO audit_log (user_id, table_name, record_id, access_type)
    VALUES (v_user_id, 'workouts', p_workout_id, 'DELETE_ERROR');
    
    RETURN false;
END;
$$;

-- Função para exclusão segura de dietas
CREATE OR REPLACE FUNCTION public.safe_delete_nutrition_plan(p_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_plan_exists BOOLEAN;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o plano existe e pertence ao usuário
  SELECT EXISTS (
    SELECT 1 FROM nutrition_plans 
    WHERE id = p_plan_id 
    AND created_by = v_user_id
  ) INTO v_plan_exists;
  
  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'Plano alimentar não encontrado ou acesso negado';
  END IF;
  
  -- Realizar exclusão com limpeza de dados
  DELETE FROM nutrition_plans 
  WHERE id = p_plan_id 
  AND created_by = v_user_id;
  
  -- Log da ação
  INSERT INTO audit_log (user_id, table_name, record_id, access_type)
  VALUES (v_user_id, 'nutrition_plans', p_plan_id, 'DELETE');
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO audit_log (user_id, table_name, record_id, access_type)
    VALUES (v_user_id, 'nutrition_plans', p_plan_id, 'DELETE_ERROR');
    
    RETURN false;
END;
$$;

-- Função para atualizar status automaticamente
CREATE OR REPLACE FUNCTION public.update_plans_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Atualizar status dos treinos
  UPDATE workouts
  SET 
    status = calculate_plan_status(start_date, end_date, status, auto_expire),
    updated_at = NOW()
  WHERE auto_expire = true
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE
    AND status != 'expired';
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Atualizar status das dietas
  UPDATE nutrition_plans
  SET 
    status = calculate_plan_status(start_date, end_date, status, auto_expire),
    updated_at = NOW()
  WHERE auto_expire = true
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE
    AND status != 'expired';
    
  GET DIAGNOSTICS v_updated_count = v_updated_count + ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION public.trigger_update_plan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calcular novo status baseado nas datas
  NEW.status := calculate_plan_status(
    NEW.start_date, 
    NEW.end_date, 
    NEW.status, 
    NEW.auto_expire
  );
  
  -- Se tem duration_days definido e data de início, calcular data de fim
  IF NEW.duration_days IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date IS NULL THEN
    NEW.end_date := NEW.start_date + (NEW.duration_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar triggers nas tabelas
DROP TRIGGER IF EXISTS workout_status_trigger ON workouts;
CREATE TRIGGER workout_status_trigger
  BEFORE INSERT OR UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_plan_status();

DROP TRIGGER IF EXISTS nutrition_plan_status_trigger ON nutrition_plans;
CREATE TRIGGER nutrition_plan_status_trigger
  BEFORE INSERT OR UPDATE ON nutrition_plans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_plan_status();

-- Atualizar planos existentes com status padrão
UPDATE workouts 
SET status = 'active' 
WHERE status IS NULL;

UPDATE nutrition_plans 
SET status = 'active' 
WHERE status IS NULL;