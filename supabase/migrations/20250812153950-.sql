-- Allow teachers to update their students' profiles and student records via a SECURITY DEFINER function
-- This avoids loosening RLS while enabling the exact workflow requested

create or replace function public.teacher_update_student_profile(
  p_student_user_id uuid,
  p_name text default null,
  p_email text default null,
  p_active_plan text default null,
  p_membership_status text default null,
  p_membership_expiry timestamptz default null,
  p_goals text[] default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure the caller is the teacher of this student
  if not public.is_teacher_of(uid, p_student_user_id) and not public.has_role(uid, 'admin'::app_role) then
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
         updated_at = now()
   where s.user_id = p_student_user_id
     and (s.teacher_id = uid or public.has_role(uid, 'admin'::app_role));

  return 'ok';
end; $$;

-- Grant execute to authenticated users (RLS + function guards enforce access)
revoke all on function public.teacher_update_student_profile(uuid, text, text, text, text, timestamptz, text[]) from public;
grant execute on function public.teacher_update_student_profile(uuid, text, text, text, text, timestamptz, text[]) to authenticated;