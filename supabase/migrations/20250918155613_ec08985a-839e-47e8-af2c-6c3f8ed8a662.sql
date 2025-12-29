-- SECURITY FIX Phase 1: Fix Critical User Privacy Issue
-- Update user_presence RLS policy to restrict viewing based on teacher-student relationships

DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;

CREATE POLICY "Users can view authorized presence only" ON public.user_presence
FOR SELECT USING (
  -- Users can see their own presence
  auth.uid() = user_id 
  OR 
  -- Students can see their teacher's presence
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() 
    AND s.teacher_id = user_presence.user_id
  )
  OR
  -- Teachers can see their students' presence  
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = auth.uid()
    AND s.user_id = user_presence.user_id
  )
);