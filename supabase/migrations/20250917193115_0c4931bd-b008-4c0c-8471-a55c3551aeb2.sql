-- Adicionar política DELETE para tabela workouts
-- Permite que professores excluam seus próprios planos de treino
CREATE POLICY "Teachers can delete own training plans" 
ON workouts 
FOR DELETE 
USING (auth.uid() = created_by);

-- Verificar e corrigir políticas UPDATE existentes para workouts
DROP POLICY IF EXISTS "Teachers can update own workouts" ON workouts;
CREATE POLICY "Teachers can update own training plans" 
ON workouts 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Verificar se a tabela nutrition_plans tem políticas adequadas
-- Adicionar política DELETE se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'nutrition_plans' 
        AND policyname LIKE '%delete%'
    ) THEN
        EXECUTE 'CREATE POLICY "Teachers can delete own diet plans" ON nutrition_plans FOR DELETE USING (auth.uid() = created_by)';
    END IF;
END $$;