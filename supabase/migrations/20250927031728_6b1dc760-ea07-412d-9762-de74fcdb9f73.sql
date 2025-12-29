-- Drop and recreate the functions with correct signatures

DROP FUNCTION IF EXISTS public.get_transaction_context(uuid, uuid);

-- Function to get transaction context
CREATE OR REPLACE FUNCTION public.get_transaction_context(
  p_authenticated_user_id UUID,
  p_target_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_context JSONB;
  v_teacher_id UUID;
BEGIN
  -- Get user type from profiles
  SELECT user_type INTO v_user_type
  FROM profiles
  WHERE id = p_authenticated_user_id;
  
  -- If user type not found, check if user is a teacher by looking at students table
  IF v_user_type IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM students WHERE teacher_id = p_authenticated_user_id
    ) THEN
      v_user_type := 'teacher';
    ELSE
      v_user_type := 'student';
    END IF;
  END IF;
  
  -- Generate context based on user type and target
  IF v_user_type = 'teacher' THEN
    IF p_target_student_id IS NULL THEN
      -- Teacher purchasing for themselves (auto-purchase)
      v_context := jsonb_build_object(
        'type', 'auto_purchase',
        'student_id', p_authenticated_user_id,
        'teacher_id', p_authenticated_user_id,
        'description', 'Teacher purchasing for themselves'
      );
    ELSE
      -- Teacher purchasing for a student
      IF EXISTS (
        SELECT 1 FROM students 
        WHERE user_id = p_target_student_id 
        AND teacher_id = p_authenticated_user_id
      ) THEN
        v_context := jsonb_build_object(
          'type', 'teacher_for_student',
          'student_id', p_target_student_id,
          'teacher_id', p_authenticated_user_id,
          'description', 'Teacher purchasing for student'
        );
      ELSE
        RAISE EXCEPTION 'Invalid teacher-student relationship';
      END IF;
    END IF;
  ELSE
    -- Student purchasing for themselves
    SELECT teacher_id INTO v_teacher_id
    FROM students
    WHERE user_id = p_authenticated_user_id
    LIMIT 1;
    
    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'Student not associated with any teacher';
    END IF;
    
    v_context := jsonb_build_object(
      'type', 'student_purchase',
      'student_id', p_authenticated_user_id,
      'teacher_id', v_teacher_id,
      'description', 'Student purchasing for themselves'
    );
  END IF;
  
  RETURN v_context;
END;
$$;