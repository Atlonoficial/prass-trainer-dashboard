-- Single teacher system: Auto-link all students to the single teacher
-- Teacher ID: 0d5398c2-278e-4853-b980-f36961795e52 (Atlon Tech)

-- 1. Link existing orphan students to the single teacher
UPDATE public.students 
SET teacher_id = '0d5398c2-278e-4853-b980-f36961795e52'::uuid,
    updated_at = now()
WHERE teacher_id IS NULL;

-- 2. Update handle_new_user function to auto-link new students
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  single_teacher_id uuid := '0d5398c2-278e-4853-b980-f36961795e52'::uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name, user_type)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')
  );

  -- If it's a student, auto-link to single teacher
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'student') = 'student' THEN
    INSERT INTO public.students (user_id, teacher_id)
    VALUES (NEW.id, single_teacher_id)
    ON CONFLICT (user_id) DO UPDATE SET
      teacher_id = single_teacher_id,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;