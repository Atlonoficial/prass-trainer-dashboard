-- CORREÇÃO DEFINITIVA: Implementar exclusão em cascata para nutrition_plans
-- Isso resolve o erro de foreign key constraint

-- 1. Primeiro, vamos ver as dependências existentes
DO $$
BEGIN
    -- Verificar se existem meal_logs que referenciam nutrition_plans
    RAISE NOTICE 'Verificando dependências de meal_logs...';
    
    -- Implementar exclusão em cascata para meal_logs
    -- Quando um nutrition_plan for deletado, todos os meal_logs relacionados serão deletados automaticamente
    
    -- Verificar se a constraint já existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'meal_logs_nutrition_plan_id_fkey' 
        AND table_name = 'meal_logs'
    ) THEN
        -- Remover constraint existente
        ALTER TABLE meal_logs DROP CONSTRAINT meal_logs_nutrition_plan_id_fkey;
        RAISE NOTICE 'Constraint existente removida';
    END IF;
    
    -- Adicionar nova constraint com CASCADE
    ALTER TABLE meal_logs 
    ADD CONSTRAINT meal_logs_nutrition_plan_id_fkey 
    FOREIGN KEY (nutrition_plan_id) 
    REFERENCES nutrition_plans(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Nova constraint com CASCADE adicionada com sucesso';
    
    -- Atualizar a função safe_delete_nutrition_plan para lidar melhor com a exclusão
    -- Agora que temos CASCADE, a função pode ser mais direta
    
END $$;