-- CORREÇÃO DEFINITIVA: REMOVER POLÍTICAS PROBLEMÁTICAS QUE CAUSAM "MALFORMED ARRAY LITERAL"
-- As políticas problemáticas são as que usam "auth.uid() = ANY (assigned_to)"

-- 1. Remover as políticas problemáticas com sintaxe ANY
DROP POLICY IF EXISTS "Users can view assigned nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Users can view assigned workouts" ON workouts;

-- 2. Verificar se as políticas corretas existem (com @> ARRAY[auth.uid()])
-- Se não existirem, criar:

-- Para nutrition_plans
DO $$
BEGIN
    -- Verificar se a política correta existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'nutrition_plans' 
        AND policyname = 'Students can view assigned nutrition plans'
    ) THEN
        CREATE POLICY "Students can view assigned nutrition plans" 
        ON nutrition_plans 
        FOR SELECT 
        USING (
          assigned_to IS NULL OR 
          assigned_to = '{}' OR 
          assigned_to @> ARRAY[auth.uid()]
        );
    END IF;
END $$;

-- Para workouts  
DO $$
BEGIN
    -- Verificar se a política correta existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'workouts' 
        AND policyname = 'Students can view assigned workouts'
    ) THEN
        CREATE POLICY "Students can view assigned workouts" 
        ON workouts 
        FOR SELECT 
        USING (
          assigned_to IS NULL OR 
          assigned_to = '{}' OR 
          assigned_to @> ARRAY[auth.uid()]
        );
    END IF;
END $$;

-- 3. Comentário explicativo
COMMENT ON TABLE nutrition_plans IS 'Tabela corrigida: removidas políticas com ANY que causavam malformed array literal';
COMMENT ON TABLE workouts IS 'Tabela corrigida: removidas políticas com ANY que causavam malformed array literal';