-- Criar função segura para deletar planos de treino
CREATE OR REPLACE FUNCTION public.safe_delete_workout(p_workout_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  workout_exists boolean := false;
  user_id uuid := auth.uid();
BEGIN
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o workout existe e se o usuário tem permissão
  SELECT EXISTS (
    SELECT 1 FROM workouts 
    WHERE id = p_workout_id 
    AND (created_by = user_id OR user_id = ANY(assigned_to))
  ) INTO workout_exists;

  IF NOT workout_exists THEN
    RAISE EXCEPTION 'Plano de treino não encontrado ou sem permissão para excluir';
  END IF;

  -- Deletar o workout
  DELETE FROM workouts WHERE id = p_workout_id;
  
  -- Verificar se foi deletado
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Erro ao excluir o plano de treino';
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Log do erro (se houver sistema de logs)
  RAISE NOTICE 'Erro ao deletar workout %: %', p_workout_id, SQLERRM;
  RETURN false;
END;
$$;

-- Criar função segura para deletar planos de dieta
CREATE OR REPLACE FUNCTION public.safe_delete_nutrition_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  plan_exists boolean := false;
  user_id uuid := auth.uid();
BEGIN
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o plano existe e se o usuário tem permissão
  SELECT EXISTS (
    SELECT 1 FROM nutrition_plans 
    WHERE id = p_plan_id 
    AND (created_by = user_id OR user_id = ANY(assigned_to))
  ) INTO plan_exists;

  IF NOT plan_exists THEN
    RAISE EXCEPTION 'Plano alimentar não encontrado ou sem permissão para excluir';
  END IF;

  -- Deletar o plano
  DELETE FROM nutrition_plans WHERE id = p_plan_id;
  
  -- Verificar se foi deletado
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Erro ao excluir o plano alimentar';
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Log do erro (se houver sistema de logs)
  RAISE NOTICE 'Erro ao deletar nutrition plan %: %', p_plan_id, SQLERRM;
  RETURN false;
END;
$$;