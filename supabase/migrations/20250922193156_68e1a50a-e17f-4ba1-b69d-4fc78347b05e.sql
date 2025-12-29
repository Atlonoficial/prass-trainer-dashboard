-- Corrigir mapeamento da função RPC teacher_update_student_profile
-- O RPC existente não estava mapeando corretamente os campos

CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(
  p_student_user_id uuid,
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_active_plan text DEFAULT NULL,
  p_membership_status text DEFAULT NULL,
  p_membership_expiry timestamp with time zone DEFAULT NULL,
  p_goals text[] DEFAULT NULL,
  p_mode text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure the caller is the teacher of this student
  if not public.is_teacher_of(uid, p_student_user_id) then
    raise exception 'Not authorized to update this student';
  end if;

  -- Update profiles (optional fields)
  if p_name is not null or p_email is not null then
    update public.profiles
       set name = coalesce(p_name, name),
           email = coalesce(p_email, email),
           updated_at = now()
     where id = p_student_user_id;
  end if;

  -- Update students row tied to this user and teacher
  update public.students s
     set active_plan = coalesce(p_active_plan, s.active_plan),
         membership_status = coalesce(p_membership_status, s.membership_status),
         membership_expiry = coalesce(p_membership_expiry, s.membership_expiry),
         goals = coalesce(p_goals, s.goals),
         mode = coalesce(p_mode, s.mode),
         updated_at = now()
   where s.user_id = p_student_user_id
     and s.teacher_id = uid;

  return 'ok';
end; 
$$;