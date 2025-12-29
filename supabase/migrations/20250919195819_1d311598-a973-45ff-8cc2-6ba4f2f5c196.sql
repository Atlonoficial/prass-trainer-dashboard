-- FASE 2.1: CORREÇÃO DEFINITIVA DOS DADOS CORROMPIDOS
-- Esta migration vai corrigir TODOS os problemas de "malformed array literal"

-- 1. CORRIGIR TABELA nutrition_plans - assigned_to corrompidos
UPDATE nutrition_plans 
SET assigned_to = CASE 
  WHEN assigned_to::text LIKE '[%]' THEN 
    -- Se já é array válido, manter
    assigned_to
  WHEN assigned_to::text ~ '^"?\[.*\]"?$' THEN 
    -- Se é string JSON válida, converter para array
    (assigned_to::text::jsonb)::uuid[]
  WHEN assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' THEN 
    -- Se é UUID único, converter para array
    ARRAY[(assigned_to::text::jsonb)::uuid]
  ELSE 
    -- Fallback para array vazio se não conseguir converter
    '{}'::uuid[]
END
WHERE assigned_to IS NOT NULL
  AND (
    assigned_to::text LIKE '"%[%]%"' OR  -- String JSON
    assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' OR  -- UUID simples
    assigned_to::text NOT LIKE '{%}' -- Não é array PostgreSQL válido
  );

-- 2. CORRIGIR TABELA workouts - assigned_to corrompidos  
UPDATE workouts 
SET assigned_to = CASE 
  WHEN assigned_to::text LIKE '[%]' THEN 
    -- Se já é array válido, manter
    assigned_to
  WHEN assigned_to::text ~ '^"?\[.*\]"?$' THEN 
    -- Se é string JSON válida, converter para array
    (assigned_to::text::jsonb)::uuid[]
  WHEN assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' THEN 
    -- Se é UUID único, converter para array
    ARRAY[(assigned_to::text::jsonb)::uuid]
  ELSE 
    -- Fallback para array vazio se não conseguir converter
    '{}'::uuid[]
END
WHERE assigned_to IS NOT NULL
  AND (
    assigned_to::text LIKE '"%[%]%"' OR  -- String JSON
    assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' OR  -- UUID simples
    assigned_to::text NOT LIKE '{%}' -- Não é array PostgreSQL válido
  );

-- 3. ATUALIZAR RPC FUNCTION delete_nutrition_plan_safe com validação robusta
CREATE OR REPLACE FUNCTION public.delete_nutrition_plan_safe(plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_rows int := 0;
  user_id uuid := auth.uid();
  plan_record RECORD;
  corrected_assigned_to uuid[];
BEGIN
  -- Log de início
  RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Iniciando exclusão segura do plano: %, usuário: %', plan_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Usuário não autenticado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Buscar o plano e validar assigned_to
  SELECT * INTO plan_record FROM nutrition_plans WHERE id = plan_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Plano não encontrado: %', plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado'
    );
  END IF;
  
  -- Corrigir assigned_to se estiver corrompido
  IF plan_record.assigned_to IS NOT NULL THEN
    BEGIN
      -- Tentar normalizar assigned_to
      corrected_assigned_to := CASE 
        WHEN plan_record.assigned_to::text LIKE '[%]' THEN 
          plan_record.assigned_to
        WHEN plan_record.assigned_to::text ~ '^"?\[.*\]"?$' THEN 
          (plan_record.assigned_to::text::jsonb)::uuid[]
        WHEN plan_record.assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' THEN 
          ARRAY[(plan_record.assigned_to::text::jsonb)::uuid]
        ELSE 
          '{}'::uuid[]
      END;
      
      -- Se foi corrigido, atualizar no banco
      IF corrected_assigned_to != plan_record.assigned_to THEN
        UPDATE nutrition_plans 
        SET assigned_to = corrected_assigned_to 
        WHERE id = plan_id;
        RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Corrigido assigned_to de % para %', plan_record.assigned_to, corrected_assigned_to;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      corrected_assigned_to := '{}'::uuid[];
      RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Erro ao corrigir assigned_to, usando array vazio: %', SQLERRM;
    END;
  ELSE
    corrected_assigned_to := '{}'::uuid[];
  END IF;
  
  -- Verificar permissões
  IF plan_record.created_by != user_id AND NOT (user_id = ANY(corrected_assigned_to)) THEN
    RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Sem permissão. created_by=%, user_id=%, assigned_to=%', 
      plan_record.created_by, user_id, corrected_assigned_to;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sem permissão para excluir este plano'
    );
  END IF;
  
  -- Executar exclusão
  DELETE FROM nutrition_plans WHERE id = plan_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Exclusão concluída. Linhas afetadas: %', affected_rows;
  
  RETURN jsonb_build_object(
    'success', true,
    'affected_rows', affected_rows,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Erro na exclusão: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 4. ATUALIZAR RPC FUNCTION delete_workout_safe com validação robusta
CREATE OR REPLACE FUNCTION public.delete_workout_safe(plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_rows int := 0;
  user_id uuid := auth.uid();
  plan_record RECORD;
  corrected_assigned_to uuid[];
BEGIN
  -- Log de início
  RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Iniciando exclusão segura do plano: %, usuário: %', plan_id, user_id;
  
  -- Verificar se o usuário está autenticado
  IF user_id IS NULL THEN
    RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Usuário não autenticado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Buscar o plano e validar assigned_to
  SELECT * INTO plan_record FROM workouts WHERE id = plan_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Plano não encontrado: %', plan_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado'
    );
  END IF;
  
  -- Corrigir assigned_to se estiver corrompido
  IF plan_record.assigned_to IS NOT NULL THEN
    BEGIN
      -- Tentar normalizar assigned_to
      corrected_assigned_to := CASE 
        WHEN plan_record.assigned_to::text LIKE '[%]' THEN 
          plan_record.assigned_to
        WHEN plan_record.assigned_to::text ~ '^"?\[.*\]"?$' THEN 
          (plan_record.assigned_to::text::jsonb)::uuid[]
        WHEN plan_record.assigned_to::text ~ '^"?[a-f0-9-]{36}"?$' THEN 
          ARRAY[(plan_record.assigned_to::text::jsonb)::uuid]
        ELSE 
          '{}'::uuid[]
      END;
      
      -- Se foi corrigido, atualizar no banco
      IF corrected_assigned_to != plan_record.assigned_to THEN
        UPDATE workouts 
        SET assigned_to = corrected_assigned_to 
        WHERE id = plan_id;
        RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Corrigido assigned_to de % para %', plan_record.assigned_to, corrected_assigned_to;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      corrected_assigned_to := '{}'::uuid[];
      RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Erro ao corrigir assigned_to, usando array vazio: %', SQLERRM;
    END;
  ELSE
    corrected_assigned_to := '{}'::uuid[];
  END IF;
  
  -- Verificar permissões
  IF plan_record.created_by != user_id AND NOT (user_id = ANY(corrected_assigned_to)) THEN
    RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Sem permissão. created_by=%, user_id=%, assigned_to=%', 
      plan_record.created_by, user_id, corrected_assigned_to;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sem permissão para excluir este plano'
    );
  END IF;
  
  -- Executar exclusão
  DELETE FROM workouts WHERE id = plan_id;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Exclusão concluída. Linhas afetadas: %', affected_rows;
  
  RETURN jsonb_build_object(
    'success', true,
    'affected_rows', affected_rows,
    'message', 'Plano excluído com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Erro na exclusão: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 5. FUNÇÃO DE VALIDAÇÃO E AUTO-CORREÇÃO para usar nos hooks
CREATE OR REPLACE FUNCTION public.validate_and_fix_assigned_to(table_name text, record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_assigned_to text;
  corrected_assigned_to uuid[];
  result jsonb;
BEGIN
  -- Buscar assigned_to atual
  IF table_name = 'nutrition_plans' THEN
    SELECT assigned_to::text INTO current_assigned_to 
    FROM nutrition_plans WHERE id = record_id;
  ELSIF table_name = 'workouts' THEN
    SELECT assigned_to::text INTO current_assigned_to 
    FROM workouts WHERE id = record_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tabela inválida');
  END IF;
  
  IF current_assigned_to IS NULL THEN
    RETURN jsonb_build_object('success', true, 'corrected', false, 'message', 'Campo assigned_to é NULL');
  END IF;
  
  -- Tentar corrigir
  BEGIN
    corrected_assigned_to := CASE 
      WHEN current_assigned_to LIKE '[%]' THEN 
        current_assigned_to::uuid[]
      WHEN current_assigned_to ~ '^"?\[.*\]"?$' THEN 
        (current_assigned_to::jsonb)::uuid[]
      WHEN current_assigned_to ~ '^"?[a-f0-9-]{36}"?$' THEN 
        ARRAY[(current_assigned_to::jsonb)::uuid]
      ELSE 
        '{}'::uuid[]
    END;
    
    -- Verificar se precisa de correção
    IF corrected_assigned_to::text != current_assigned_to THEN
      -- Aplicar correção
      IF table_name = 'nutrition_plans' THEN
        UPDATE nutrition_plans SET assigned_to = corrected_assigned_to WHERE id = record_id;
      ELSIF table_name = 'workouts' THEN
        UPDATE workouts SET assigned_to = corrected_assigned_to WHERE id = record_id;
      END IF;
      
      result := jsonb_build_object(
        'success', true, 
        'corrected', true,
        'before', current_assigned_to,
        'after', corrected_assigned_to::text,
        'message', 'Campo assigned_to corrigido com sucesso'
      );
    ELSE
      result := jsonb_build_object(
        'success', true, 
        'corrected', false,
        'message', 'Campo assigned_to já está correto'
      );
    END IF;
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'message', 'Erro ao corrigir assigned_to'
    );
  END;
END;
$$;