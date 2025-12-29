-- Remove the problematic view completely since it's causing security issues
-- Instead, we'll rely on proper RLS policies on the appointments table
DROP VIEW IF EXISTS active_appointments;

-- Ensure RLS is properly enabled for appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create a simpler index without the problematic WHERE clause
-- The three-month filtering will be done in application queries
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_scheduled_desc 
ON public.appointments(teacher_id, scheduled_time DESC);

-- Create index for student queries
CREATE INDEX IF NOT EXISTS idx_appointments_student_scheduled_desc
ON public.appointments(student_id, scheduled_time DESC);