-- Criar função definitiva para exclusão segura de treinos com validação de UUID
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
  -- Log de debug detalhado
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

  -- Validar se o UUID é válido (isso evita o erro "malformed array literal")
  IF p_workout_id IS NULL THEN
    RAISE NOTICE 'Workout ID is NULL';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_uuid',
      'message', 'ID do treino é inválido (NULL)'
    );
  END IF;

  -- Buscar o treino e verificar permissões
  SELECT * INTO workout_record
  FROM workouts 
  WHERE id = p_workout_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Workout not found: %', p_workout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'workout_not_found', 
      'message', 'Treino não encontrado'
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
      'message', 'Sem permissão para excluir este treino'
    );
  END IF;

  -- Deletar o treino
  DELETE FROM workouts WHERE id = p_workout_id;
  
  -- Verificar se foi deletado
  IF NOT FOUND THEN
    RAISE NOTICE 'Delete operation failed for workout: %', p_workout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'delete_failed',
      'message', 'Falha na exclusão do treino'
    );
  END IF;

  RAISE NOTICE 'Workout successfully deleted: %', p_workout_id;
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Treino excluído com sucesso'
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