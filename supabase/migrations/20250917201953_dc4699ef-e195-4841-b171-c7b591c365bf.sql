-- Primeiro remover as funções existentes
DROP FUNCTION IF EXISTS public.safe_delete_workout(uuid);
DROP FUNCTION IF EXISTS public.safe_delete_nutrition_plan(uuid);

-- Recriar função safe_delete_workout com melhor autenticação e logging
CREATE OR REPLACE FUNCTION public.safe_delete_workout(p_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  workout_exists boolean := false;
  user_id uuid := auth.uid();
  workout_record record;
  result jsonb;
BEGIN
  -- Log de debug
  RAISE NOTICE 'safe_delete_workout called with workout_id: %, user_id: %', p_workout_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE 'User not authenticated - auth.uid() returned NULL';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar o workout e verificar permissões
  SELECT * INTO workout_record
  FROM workouts 
  WHERE id = p_workout_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Workout not found: %', p_workout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'workout_not_found',
      'message', 'Plano de treino não encontrado'
    );
  END IF;

  RAISE NOTICE 'Found workout - created_by: %, assigned_to: %', workout_record.created_by, workout_record.assigned_to;

  -- Verificar permissões (criador ou usuário na lista assigned_to)
  IF workout_record.created_by = user_id THEN
    workout_exists := true;
    RAISE NOTICE 'User is creator - permission granted';
  ELSIF workout_record.assigned_to IS NOT NULL AND user_id = ANY(workout_record.assigned_to) THEN
    workout_exists := true;
    RAISE NOTICE 'User is in assigned_to array - permission granted';
  ELSE
    RAISE NOTICE 'User has no permission - created_by: %, assigned_to: %, user_id: %', 
      workout_record.created_by, workout_record.assigned_to, user_id;
  END IF;

  IF NOT workout_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'permission_denied',
      'message', 'Sem permissão para excluir este plano'
    );
  END IF;

  -- Deletar o workout
  DELETE FROM workouts WHERE id = p_workout_id;
  
  -- Verificar se foi deletado
  IF NOT FOUND THEN
    RAISE NOTICE 'Delete operation failed for workout: %', p_workout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'delete_failed',
      'message', 'Falha na exclusão do plano'
    );
  END IF;

  RAISE NOTICE 'Workout successfully deleted: %', p_workout_id;
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Exception in safe_delete_workout - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'exception',
    'message', 'Erro interno: ' || SQLERRM
  );
END;
$$;

-- Recriar função safe_delete_nutrition_plan
CREATE OR REPLACE FUNCTION public.safe_delete_nutrition_plan(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  plan_exists boolean := false;
  user_id uuid := auth.uid();
  plan_record record;
  result jsonb;
BEGIN
  -- Log de debug
  RAISE NOTICE 'safe_delete_nutrition_plan called with plan_id: %, user_id: %', p_plan_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE 'User not authenticated - auth.uid() returned NULL';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar o plano e verificar permissões
  SELECT * INTO plan_record
  FROM nutrition_plans 
  WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Nutrition plan not found: %', p_plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'plan_not_found', 
      'message', 'Plano alimentar não encontrado'
    );
  END IF;

  RAISE NOTICE 'Found nutrition plan - created_by: %, assigned_to: %', plan_record.created_by, plan_record.assigned_to;

  -- Verificar permissões (criador ou usuário na lista assigned_to)
  IF plan_record.created_by = user_id THEN
    plan_exists := true;
    RAISE NOTICE 'User is creator - permission granted';
  ELSIF plan_record.assigned_to IS NOT NULL AND user_id = ANY(plan_record.assigned_to) THEN
    plan_exists := true;
    RAISE NOTICE 'User is in assigned_to array - permission granted';
  ELSE
    RAISE NOTICE 'User has no permission - created_by: %, assigned_to: %, user_id: %', 
      plan_record.created_by, plan_record.assigned_to, user_id;
  END IF;

  IF NOT plan_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'permission_denied',
      'message', 'Sem permissão para excluir este plano'
    );
  END IF;

  -- Deletar o plano
  DELETE FROM nutrition_plans WHERE id = p_plan_id;
  
  -- Verificar se foi deletado
  IF NOT FOUND THEN
    RAISE NOTICE 'Delete operation failed for nutrition plan: %', p_plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'delete_failed',
      'message', 'Falha na exclusão do plano'
    );
  END IF;

  RAISE NOTICE 'Nutrition plan successfully deleted: %', p_plan_id;
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Exception in safe_delete_nutrition_plan - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'exception',
    'message', 'Erro interno: ' || SQLERRM
  );
END;
$$;