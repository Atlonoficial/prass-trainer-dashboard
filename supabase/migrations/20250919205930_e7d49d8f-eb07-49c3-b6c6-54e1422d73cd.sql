-- Migração dos dados existentes de nutrition_plans para meal_plans
-- e remoção da tabela antiga

-- 1. Migrar dados existentes (se houver)
INSERT INTO meal_plans (
  name,
  description, 
  meals_data,
  assigned_students,
  created_by,
  status,
  created_at,
  updated_at
)
SELECT 
  COALESCE(name, 'Plano Migrado') as name,
  description,
  COALESCE(meals, '[]'::jsonb) as meals_data,
  COALESCE(
    CASE 
      WHEN assigned_to IS NULL THEN '{}'::uuid[]
      WHEN pg_typeof(assigned_to) = 'uuid[]'::regtype THEN assigned_to
      ELSE convert_assigned_to_array(assigned_to::text)
    END,
    '{}'::uuid[]
  ) as assigned_students,
  created_by,
  COALESCE(status, 'active') as status,
  created_at,
  updated_at
FROM nutrition_plans
WHERE NOT EXISTS (
  SELECT 1 FROM meal_plans mp 
  WHERE mp.name = COALESCE(nutrition_plans.name, 'Plano Migrado')
  AND mp.created_by = nutrition_plans.created_by
);

-- 2. Remover tabela nutrition_plans antiga
DROP TABLE IF EXISTS nutrition_plans CASCADE;

-- 3. Limpar função auxiliar que não será mais necessária
DROP FUNCTION IF EXISTS convert_assigned_to_array(text) CASCADE;
DROP FUNCTION IF EXISTS validate_and_fix_assigned_to(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_nutrition_plan_safe(uuid) CASCADE;