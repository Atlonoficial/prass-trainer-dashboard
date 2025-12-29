-- Atualizar treinos existentes com tenant_id correto
UPDATE workout_plans 
SET tenant_id = (SELECT tenant_id FROM profiles WHERE id = created_by)
WHERE tenant_id IS NULL AND created_by IS NOT NULL;