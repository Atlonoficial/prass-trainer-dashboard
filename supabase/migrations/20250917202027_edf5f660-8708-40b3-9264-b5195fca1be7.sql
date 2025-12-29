-- Corrigir issues de search_path das funções de segurança
CREATE OR REPLACE FUNCTION public.is_teacher_of(teacher_id uuid, student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE teacher_id = $1 AND user_id = $2
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_course_access(course_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    LEFT JOIN public.user_purchases up ON (up.course_id = c.id AND up.user_id = $2)
    WHERE c.id = $1 
    AND (
      c.is_free = true 
      OR c.instructor = $2
      OR up.id IS NOT NULL
      OR $2 = ANY(c.enrolled_users)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = $1 AND user_type = $2
  );
$$;