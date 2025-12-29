-- Adicionar campos de gestão de tempo e status para treinos e dietas (versão corrigida)

-- Adicionar campos na tabela workouts (treinos)
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_expire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30;

-- Adicionar campos na tabela nutrition_plans (dietas)
ALTER TABLE public.nutrition_plans 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_expire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30;

-- Adicionar constraints de status
ALTER TABLE public.workouts 
DROP CONSTRAINT IF EXISTS workouts_status_check,
ADD CONSTRAINT workouts_status_check CHECK (status IN ('active', 'inactive', 'expired', 'archived'));

ALTER TABLE public.nutrition_plans 
DROP CONSTRAINT IF EXISTS nutrition_plans_status_check,
ADD CONSTRAINT nutrition_plans_status_check CHECK (status IN ('active', 'inactive', 'expired', 'archived'));

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
  
  -- Realizar exclusão
  DELETE FROM workouts 
  WHERE id = p_workout_id 
  AND created_by = v_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
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
  
  -- Realizar exclusão
  DELETE FROM nutrition_plans 
  WHERE id = p_plan_id 
  AND created_by = v_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Atualizar planos existentes com status padrão
UPDATE workouts 
SET status = 'active' 
WHERE status IS NULL;

UPDATE nutrition_plans 
SET status = 'active' 
WHERE status IS NULL;