-- WORKOUT SYSTEM 2.0 - Data Migration and Cleanup
-- Step 1: Migrate existing data from workouts to workout_plans

INSERT INTO workout_plans (
  name, 
  description, 
  exercises_data, 
  assigned_students, 
  created_by, 
  status, 
  difficulty, 
  duration_weeks, 
  sessions_per_week, 
  is_template, 
  tags, 
  notes, 
  created_at, 
  updated_at
)
SELECT 
  COALESCE(w.name, 'Plano de Treino') as name,
  w.description,
  COALESCE(w.exercises, '[]'::jsonb) as exercises_data,
  COALESCE(w.assigned_to, '{}') as assigned_students,
  w.created_by,
  CASE 
    WHEN w.is_active = true THEN 'active'::text
    ELSE 'inactive'::text 
  END as status,
  COALESCE(w.difficulty, 'intermediate') as difficulty,
  COALESCE(w.estimated_duration, 4) as duration_weeks,
  4 as sessions_per_week,
  COALESCE(w.is_template, false) as is_template,
  COALESCE(w.tags, '{}') as tags,
  COALESCE(w.general_observations, '') as notes,
  COALESCE(w.created_at, now()) as created_at,
  COALESCE(w.updated_at, now()) as updated_at
FROM workouts w
WHERE NOT EXISTS (
  SELECT 1 FROM workout_plans wp 
  WHERE wp.created_by = w.created_by 
    AND wp.name = COALESCE(w.name, 'Plano de Treino')
    AND wp.created_at::date = w.created_at::date
)
AND w.created_by IS NOT NULL;

-- Step 2: Remove the problematic RPC function
DROP FUNCTION IF EXISTS delete_workout_safe(uuid);

-- Step 3: Remove the convert_assigned_to_array function (doesn't exist)
DROP FUNCTION IF EXISTS convert_assigned_to_array(text);

-- Step 4: Add indexes for better performance on workout_plans
CREATE INDEX IF NOT EXISTS idx_workout_plans_created_by ON workout_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_workout_plans_assigned_students ON workout_plans USING gin(assigned_students);
CREATE INDEX IF NOT EXISTS idx_workout_plans_status ON workout_plans(status);
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_template ON workout_plans(is_template);

-- Step 5: Enable realtime for workout_plans table
ALTER TABLE workout_plans REPLICA IDENTITY FULL;

-- Step 6: Add workout_plans to realtime publication
SELECT pg_catalog.set_config('search_path', 'public', false);
ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;