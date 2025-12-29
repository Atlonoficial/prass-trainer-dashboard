-- FASE 2.1: CORREÇÃO DEFINITIVA DOS DADOS CORROMPIDOS - VERSÃO CORRIGIDA
-- Esta migration vai corrigir TODOS os problemas de "malformed array literal"

-- 1. FUNÇÃO AUXILIAR para converter assigned_to corrompidos para array válido
CREATE OR REPLACE FUNCTION convert_assigned_to_array(input_value text)
RETURNS uuid[]
LANGUAGE plpgsql
AS $$
DECLARE
  result uuid[];
  json_array jsonb;
  item_text text;
  item jsonb;
BEGIN
  -- Se é NULL ou vazio, retornar array vazio
  IF input_value IS NULL OR input_value = '' THEN
    RETURN '{}'::uuid[];
  END IF;
  
  -- Remover aspas externas se existirem
  input_value := trim(both '"' from input_value);
  
  -- Se já é um array PostgreSQL válido {uuid,uuid}, retornar como está
  IF input_value ~ '^\{[a-f0-9,-]*\}$' THEN
    RETURN input_value::uuid[];
  END IF;
  
  -- Se é um array JSON ["uuid","uuid"], converter
  IF input_value ~ '^\[.*\]$' THEN
    BEGIN
      json_array := input_value::jsonb;
      result := ARRAY[]::uuid[];
      
      FOR item IN SELECT * FROM jsonb_array_elements(json_array)
      LOOP
        item_text := trim(both '"' from item::text);
        IF item_text ~ '^[a-f0-9-]{36}$' THEN
          result := array_append(result, item_text::uuid);
        END IF;
      END LOOP;
      
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      RETURN '{}'::uuid[];
    END;
  END IF;
  
  -- Se é um UUID simples, converter para array
  IF input_value ~ '^[a-f0-9-]{36}$' THEN
    RETURN ARRAY[input_value::uuid];
  END IF;
  
  -- Se não conseguiu converter, retornar array vazio
  RETURN '{}'::uuid[];
END;
$$;

-- 2. CORRIGIR TABELA nutrition_plans
UPDATE nutrition_plans 
SET assigned_to = convert_assigned_to_array(assigned_to::text)
WHERE assigned_to IS NOT NULL
  AND (
    assigned_to::text LIKE '"%' OR  -- Tem aspas externas
    assigned_to::text LIKE '[%]' OR  -- É JSON array
    assigned_to::text ~ '^[a-f0-9-]{36}$'  -- É UUID simples
  );

-- 3. CORRIGIR TABELA workouts
UPDATE workouts 
SET assigned_to = convert_assigned_to_array(assigned_to::text)
WHERE assigned_to IS NOT NULL
  AND (
    assigned_to::text LIKE '"%' OR  -- Tem aspas externas
    assigned_to::text LIKE '[%]' OR  -- É JSON array
    assigned_to::text ~ '^[a-f0-9-]{36}$'  -- É UUID simples
  );

-- 4. ATUALIZAR RPC FUNCTION delete_nutrition_plan_safe com validação robusta
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
  corrected_assigned_to := convert_assigned_to_array(plan_record.assigned_to::text);
  
  -- Se foi corrigido, atualizar no banco
  IF corrected_assigned_to != plan_record.assigned_to OR plan_record.assigned_to IS NULL THEN
    UPDATE nutrition_plans 
    SET assigned_to = corrected_assigned_to 
    WHERE id = plan_id;
    RAISE NOTICE '[SAFE_DELETE_NUTRITION_V2] Corrigido assigned_to de % para %', plan_record.assigned_to, corrected_assigned_to;
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

-- 5. ATUALIZAR RPC FUNCTION delete_workout_safe com validação robusta
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
  corrected_assigned_to := convert_assigned_to_array(plan_record.assigned_to::text);
  
  -- Se foi corrigido, atualizar no banco
  IF corrected_assigned_to != plan_record.assigned_to OR plan_record.assigned_to IS NULL THEN
    UPDATE workouts 
    SET assigned_to = corrected_assigned_to 
    WHERE id = plan_id;
    RAISE NOTICE '[SAFE_DELETE_WORKOUT_V2] Corrigido assigned_to de % para %', plan_record.assigned_to, corrected_assigned_to;
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

-- 6. FUNÇÃO DE VALIDAÇÃO E AUTO-CORREÇÃO para usar nos hooks
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
  
  -- Tentar corrigir usando a função auxiliar
  corrected_assigned_to := convert_assigned_to_array(current_assigned_to);
  
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
END;
$$;

-- 7. REMOVER FUNÇÃO AUXILIAR (não precisamos manter ela depois da correção)
-- DROP FUNCTION convert_assigned_to_array(text);