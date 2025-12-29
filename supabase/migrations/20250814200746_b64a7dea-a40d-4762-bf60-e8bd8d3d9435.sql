-- Clean up: Remove teacher from students table
DELETE FROM public.students 
WHERE user_id = '0d5398c2-278e-4853-b980-f36961795e52';

-- Update handle_new_user to prevent teachers from being inserted as students
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Only link students to teacher, not teachers themselves
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'student') = 'student' 
     AND NEW.id != single_teacher_id THEN
    INSERT INTO public.students (user_id, teacher_id)
    VALUES (NEW.id, single_teacher_id)
    ON CONFLICT (user_id) DO UPDATE SET
      teacher_id = single_teacher_id,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;