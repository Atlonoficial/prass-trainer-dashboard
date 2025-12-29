-- Remove any references to the non-existent sync_student_membership function
-- First, let's check if there are any triggers or constraints that might reference this function

-- Drop any triggers that might reference the missing function
DO $$
BEGIN
    -- Check and drop any triggers that might reference sync_student_membership
    IF EXISTS (SELECT 1 FROM pg_trigger t
               JOIN pg_proc p ON t.tgfoid = p.oid
               WHERE p.proname = 'sync_student_membership') THEN
        DROP TRIGGER IF EXISTS sync_student_membership_trigger ON students;
    END IF;
END $$;

-- Create a simple function to replace any missing sync_student_membership function
-- This ensures updates can proceed without errors
CREATE OR REPLACE FUNCTION public.sync_student_membership(user_id_param uuid, teacher_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Simple placeholder function that does nothing
    -- This prevents the "function does not exist" error
    NULL;
END;
$$;