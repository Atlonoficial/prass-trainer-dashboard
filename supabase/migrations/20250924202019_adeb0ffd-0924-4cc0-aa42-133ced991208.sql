-- Fix RLS policies for student updates by teachers
DROP POLICY IF EXISTS "Teachers can update student profiles" ON public.students;

-- Create proper policy for teachers to update their students
CREATE POLICY "Teachers can update their students" 
ON public.students 
FOR UPDATE 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Ensure teachers can select their students (if not already exists)
DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;
CREATE POLICY "Teachers can view their students" 
ON public.students 
FOR SELECT 
USING (auth.uid() = teacher_id);