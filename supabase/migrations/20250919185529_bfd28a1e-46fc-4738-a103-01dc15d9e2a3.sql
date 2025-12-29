-- CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS - ELIMINAÇÃO DO "MALFORMED ARRAY LITERAL"
-- Focando apenas nas tabelas que existem: nutrition_plans e workouts

-- 1. Remover políticas problemáticas existentes
DROP POLICY IF EXISTS "Students can view assigned nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Students can view assigned workouts" ON workouts;

-- 2. Recriar políticas com sintaxe correta para arrays
-- Política para nutrition_plans - usar @> ao invés de ANY para arrays
CREATE POLICY "Students can view assigned nutrition plans" 
ON nutrition_plans 
FOR SELECT 
USING (
  assigned_to IS NULL OR 
  assigned_to = '{}' OR 
  assigned_to @> ARRAY[auth.uid()]
);

-- Política para workouts - usar @> ao invés de ANY para arrays  
CREATE POLICY "Students can view assigned workouts" 
ON workouts 
FOR SELECT 
USING (
  assigned_to IS NULL OR 
  assigned_to = '{}' OR 
  assigned_to @> ARRAY[auth.uid()]
);

-- 3. Garantir que as políticas de professores funcionem corretamente
-- Recriar política para professores visualizarem seus próprios planos
CREATE POLICY "Teachers can view own nutrition plans" 
ON nutrition_plans 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Teachers can view own workouts" 
ON workouts 
FOR SELECT 
USING (created_by = auth.uid());

-- 4. Comentário explicativo da correção
COMMENT ON POLICY "Students can view assigned nutrition plans" ON nutrition_plans IS 
'Corrigido: Usa @> ARRAY[auth.uid()] ao invés de auth.uid() = ANY(assigned_to) para evitar malformed array literal';

COMMENT ON POLICY "Students can view assigned workouts" ON workouts IS 
'Corrigido: Usa @> ARRAY[auth.uid()] ao invés de auth.uid() = ANY(assigned_to) para evitar malformed array literal';