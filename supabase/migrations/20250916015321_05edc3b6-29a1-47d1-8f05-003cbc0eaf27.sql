-- Enhanced security fix for course content access
-- This migration strengthens RLS policies to prevent unauthorized access to paid course content

-- First, let's create a robust function to check course access
CREATE OR REPLACE FUNCTION public.user_has_course_access(p_course_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return false if no user provided
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if course exists and get its properties
  DECLARE
    course_record RECORD;
  BEGIN
    SELECT is_free, instructor, is_published 
    INTO course_record 
    FROM courses 
    WHERE id = p_course_id;
    
    -- Course doesn't exist
    IF NOT FOUND THEN
      RETURN false;
    END IF;
    
    -- Course is not published (only instructor can access)
    IF NOT course_record.is_published AND course_record.instructor != p_user_id THEN
      RETURN false;
    END IF;
    
    -- Free course - allow access to published courses
    IF course_record.is_free AND course_record.is_published THEN
      RETURN true;
    END IF;
    
    -- Instructor always has access to their own courses
    IF course_record.instructor = p_user_id THEN
      RETURN true;
    END IF;
    
    -- For paid courses, check if user has purchased
    IF NOT course_record.is_free THEN
      RETURN EXISTS (
        SELECT 1 
        FROM user_purchases 
        WHERE user_id = p_user_id 
        AND course_id = p_course_id
      );
    END IF;
    
    RETURN false;
  END;
END;
$$;

-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "Students can view accessible lessons" ON course_lessons;
DROP POLICY IF EXISTS "Teachers can manage own course lessons" ON course_lessons;

-- Create strict new policies for course_lessons
CREATE POLICY "Secure lesson access - instructors only"
ON course_lessons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_lessons.module_id 
    AND c.instructor = auth.uid()
  )
);

CREATE POLICY "Secure lesson access - verified users only"
ON course_lessons
FOR SELECT
TO authenticated
USING (
  -- Must be published lesson
  is_published = true
  AND
  -- User must have access to the course
  EXISTS (
    SELECT 1 
    FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.id = course_lessons.module_id 
    AND public.user_has_course_access(c.id, auth.uid())
  )
  AND
  (
    -- Free lesson OR user has course access
    is_free = true
    OR
    EXISTS (
      SELECT 1 
      FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = course_lessons.module_id 
      AND (
        c.is_free = true 
        OR c.instructor = auth.uid()
        OR EXISTS (
          SELECT 1 
          FROM user_purchases up 
          WHERE up.user_id = auth.uid() 
          AND up.course_id = c.id
        )
      )
    )
  )
);

-- Also strengthen course_modules access
DROP POLICY IF EXISTS "Teachers can manage own course modules" ON course_modules;
DROP POLICY IF EXISTS "Students can view accessible modules" ON course_modules;

CREATE POLICY "Secure module access - instructors only"
ON course_modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM courses c
    WHERE c.id = course_modules.course_id 
    AND c.instructor = auth.uid()
  )
);

CREATE POLICY "Secure module access - verified users only"
ON course_modules
FOR SELECT
TO authenticated
USING (
  -- Must be published module
  is_published = true
  AND
  -- User must have access to the course
  EXISTS (
    SELECT 1 
    FROM courses c
    WHERE c.id = course_modules.course_id 
    AND public.user_has_course_access(c.id, auth.uid())
  )
);

-- Create missing user_purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  order_id text,
  purchase_type text DEFAULT 'course',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on user_purchases
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_purchases
CREATE POLICY "Users can view own purchases" 
ON user_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" 
ON user_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Instructors can view purchases of their courses
CREATE POLICY "Instructors can view course purchases"
ON user_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM courses c 
    WHERE c.id = user_purchases.course_id 
    AND c.instructor = auth.uid()
  )
);

COMMENT ON FUNCTION user_has_course_access IS 'Security function to verify if a user has legitimate access to course content';
COMMENT ON TABLE user_purchases IS 'Records of course purchases for access control';