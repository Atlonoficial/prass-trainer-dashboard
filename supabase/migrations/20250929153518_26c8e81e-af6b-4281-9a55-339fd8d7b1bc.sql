-- CONTINUE SECURITY FIXES - REMAINING FUNCTIONS
-- Fix the remaining functions that lack search_path configuration

-- 1. Fix is_teacher function
CREATE OR REPLACE FUNCTION public.is_teacher(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND user_type = 'teacher'
  );
$$;

-- 2. Fix calculate_user_level function
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN FLOOR(SQRT(points / 100.0)) + 1;
END;
$$;

-- 3. Fix get_current_plan_week function
CREATE OR REPLACE FUNCTION public.get_current_plan_week(plan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weeks_passed INTEGER;
  rotation_weeks INTEGER;
  start_date DATE;
BEGIN
  SELECT 
    np.rotation_weeks,
    np.week_start_date
  INTO rotation_weeks, start_date
  FROM nutrition_plans np
  WHERE np.id = plan_id;
  
  IF start_date IS NULL THEN
    RETURN 1;
  END IF;
  
  weeks_passed := FLOOR(EXTRACT(days FROM (CURRENT_DATE - start_date)) / 7);
  RETURN (weeks_passed % rotation_weeks) + 1;
END;
$$;

-- 4. Fix user_has_content_access function
CREATE OR REPLACE FUNCTION public.user_has_content_access(p_content_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_content_permissions scp
    JOIN students s ON s.user_id = scp.student_id AND s.teacher_id = scp.teacher_id
    WHERE scp.student_id = auth.uid() 
      AND scp.content_id = p_content_id
  );
$$;

-- 5. Fix get_teacher_name function
CREATE OR REPLACE FUNCTION public.get_teacher_name(teacher_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_name text;
BEGIN
  SELECT COALESCE(p.name, p.email) INTO teacher_name
  FROM profiles p
  WHERE p.id = teacher_id_param;
  
  RETURN COALESCE(teacher_name, 'Professor');
END;
$$;