-- CORREÇÃO DEFINITIVA: Recriar função safe_delete_workout com melhor tratamento
DROP FUNCTION IF EXISTS public.safe_delete_workout(uuid);

CREATE OR REPLACE FUNCTION public.safe_delete_workout(p_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  workout_exists boolean := false;
  user_id uuid;
  workout_record record;
  result jsonb;
BEGIN
  -- Obter user_id de forma mais robusta
  SELECT auth.uid() INTO user_id;
  
  -- Log detalhado de debug
  RAISE NOTICE 'safe_delete_workout called with workout_id: %, user_id: %', p_workout_id, user_id;
  
  -- Verificar autenticação
  IF user_id IS NULL THEN
    RAISE NOTICE 'Authentication failed - auth.uid() returned NULL';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar o workout com tratamento de array melhorado
  SELECT 
    id, name, created_by, 
    COALESCE(assigned_to, '{}') as assigned_to
  INTO workout_record
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

  RAISE NOTICE 'Found workout - ID: %, created_by: %, assigned_to: %', 
    workout_record.id, workout_record.created_by, workout_record.assigned_to;

  -- Verificar permissões com melhor tratamento de array
  IF workout_record.created_by = user_id THEN
    workout_exists := true;
    RAISE NOTICE 'User is creator - permission granted';
  ELSIF workout_record.assigned_to IS NOT NULL 
    AND array_length(workout_record.assigned_to, 1) > 0 
    AND user_id = ANY(workout_record.assigned_to) THEN
    workout_exists := true;
    RAISE NOTICE 'User is in assigned_to array - permission granted';
  ELSE
    RAISE NOTICE 'Permission denied - user_id: % not authorized for workout: %', 
      user_id, p_workout_id;
  END IF;

  IF NOT workout_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'permission_denied',
      'message', 'Sem permissão para excluir este plano'
    );
  END IF;

  -- Executar delete
  DELETE FROM workouts WHERE id = p_workout_id;
  
  -- Verificar se delete foi executado
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
$function$;