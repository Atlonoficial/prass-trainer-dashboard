-- FASE 1: LIMPEZA RADICAL DE RLS POLICIES E REESTRUTURAÇÃO COMPLETA
-- Remover TODAS as políticas existentes e recriar apenas as essenciais

-- 1.1 LIMPEZA TOTAL - Remover todas as políticas das tabelas problemáticas
DROP POLICY IF EXISTS "Users can view assigned nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can view assigned workouts" ON workouts;
DROP POLICY IF EXISTS "Students can view assigned nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Students can view assigned workouts" ON workouts;
DROP POLICY IF EXISTS "Teachers can create nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Teachers can create workouts" ON workouts;
DROP POLICY IF EXISTS "Teachers can update nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Teachers can update workouts" ON workouts;
DROP POLICY IF EXISTS "Teachers can delete nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Teachers can delete workouts" ON workouts;
DROP POLICY IF EXISTS "Teachers can view all nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Teachers can view all workouts" ON workouts;

-- 1.2 RECRIAR POLÍTICAS MINIMALISTAS E BULLETPROOF
-- Para nutrition_plans - apenas 3 políticas essenciais
CREATE POLICY "nutrition_plans_select_policy" ON nutrition_plans FOR SELECT USING (
  created_by = auth.uid() OR 
  (assigned_to IS NOT NULL AND assigned_to @> ARRAY[auth.uid()])
);

CREATE POLICY "nutrition_plans_insert_policy" ON nutrition_plans FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "nutrition_plans_all_actions_policy" ON nutrition_plans FOR ALL USING (
  created_by = auth.uid()
) WITH CHECK (
  created_by = auth.uid()
);

-- Para workouts - apenas 3 políticas essenciais
CREATE POLICY "workouts_select_policy" ON workouts FOR SELECT USING (
  created_by = auth.uid() OR 
  (assigned_to IS NOT NULL AND assigned_to @> ARRAY[auth.uid()])
);

CREATE POLICY "workouts_insert_policy" ON workouts FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "workouts_all_actions_policy" ON workouts FOR ALL USING (
  created_by = auth.uid()
) WITH CHECK (
  created_by = auth.uid()
);

-- 1.3 CRIAR FUNÇÃO RPC PARA EXCLUSÃO SEGURA DE PLANOS ALIMENTARES
CREATE OR REPLACE FUNCTION delete_nutrition_plan_safe(plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows int := 0;
  user_id uuid := auth.uid();
BEGIN
  -- Log de início
  RAISE NOTICE '[SAFE_DELETE_NUTRITION] Iniciando exclusão do plano: %, usuário: %', plan_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE '[SAFE_DELETE_NUTRITION] Usuário não autenticado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o plano existe e pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM nutrition_plans 
    WHERE id = plan_id AND created_by = user_id
  ) THEN
    RAISE NOTICE '[SAFE_DELETE_NUTRITION] Plano não encontrado ou sem permissão: %', plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado ou sem permissão'
    );
  END IF;
  
  -- Executar exclusão
  DELETE FROM nutrition_plans 
  WHERE id = plan_id AND created_by = user_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE '[SAFE_DELETE_NUTRITION] Exclusão concluída. Linhas afetadas: %', affected_rows;
  
  RETURN jsonb_build_object(
    'success', true,
    'affected_rows', affected_rows,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[SAFE_DELETE_NUTRITION] Erro na exclusão: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 1.4 CRIAR FUNÇÃO RPC PARA EXCLUSÃO SEGURA DE PLANOS DE TREINO
CREATE OR REPLACE FUNCTION delete_workout_safe(plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows int := 0;
  user_id uuid := auth.uid();
BEGIN
  -- Log de início
  RAISE NOTICE '[SAFE_DELETE_WORKOUT] Iniciando exclusão do plano: %, usuário: %', plan_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE '[SAFE_DELETE_WORKOUT] Usuário não autenticado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o plano existe e pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM workouts 
    WHERE id = plan_id AND created_by = user_id
  ) THEN
    RAISE NOTICE '[SAFE_DELETE_WORKOUT] Plano não encontrado ou sem permissão: %', plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado ou sem permissão'
    );
  END IF;
  
  -- Executar exclusão
  DELETE FROM workouts 
  WHERE id = plan_id AND created_by = user_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE '[SAFE_DELETE_WORKOUT] Exclusão concluída. Linhas afetadas: %', affected_rows;
  
  RETURN jsonb_build_object(
    'success', true,
    'affected_rows', affected_rows,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[SAFE_DELETE_WORKOUT] Erro na exclusão: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 1.5 COMENTÁRIOS EXPLICATIVOS
COMMENT ON TABLE nutrition_plans IS 'FASE 1 APLICADA: RLS policies minimalistas, exclusão via RPC';
COMMENT ON TABLE workouts IS 'FASE 1 APLICADA: RLS policies minimalistas, exclusão via RPC';