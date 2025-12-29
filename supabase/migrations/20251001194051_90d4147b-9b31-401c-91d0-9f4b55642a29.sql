-- Fix foreign key constraint to allow user deletion
-- The issue is that workouts.created_by references auth.users directly
-- We need to change it to CASCADE on delete

-- First, drop the existing foreign key constraint
ALTER TABLE workouts 
DROP CONSTRAINT IF EXISTS workouts_created_by_fkey;

-- Add the constraint back with ON DELETE CASCADE
ALTER TABLE workouts
ADD CONSTRAINT workouts_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Do the same for other tables that might have this issue
ALTER TABLE workout_plans 
DROP CONSTRAINT IF EXISTS workout_plans_created_by_fkey;

ALTER TABLE workout_plans
ADD CONSTRAINT workout_plans_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE meal_plans 
DROP CONSTRAINT IF EXISTS meal_plans_created_by_fkey;

ALTER TABLE meal_plans
ADD CONSTRAINT meal_plans_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add indexes for tenant_id to improve performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_tenant_id ON workout_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_tenant_id ON meal_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(teacher_id, student_id);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_tenant_created ON workout_plans(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_tenant_created ON meal_plans(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_teacher_user ON students(teacher_id, user_id);