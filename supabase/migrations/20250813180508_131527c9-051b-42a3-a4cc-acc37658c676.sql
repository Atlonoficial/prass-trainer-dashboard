-- Update user_type to 'teacher' for users who have created plans
UPDATE public.profiles 
SET user_type = 'teacher', updated_at = now()
WHERE id IN (
  SELECT DISTINCT teacher_id 
  FROM public.plan_catalog 
  WHERE teacher_id IS NOT NULL
) AND user_type = 'student';