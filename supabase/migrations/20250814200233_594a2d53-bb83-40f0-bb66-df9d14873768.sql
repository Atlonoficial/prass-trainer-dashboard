-- Update ensure_student_record to use single teacher system
CREATE OR REPLACE FUNCTION public.ensure_student_record()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  uid uuid := auth.uid();
  single_teacher_id uuid := '0d5398c2-278e-4853-b980-f36961795e52'::uuid;
  is_teacher boolean := false;
begin
  if uid is null then
    return 'no-auth';
  end if;

  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.user_type = 'teacher'
  ) into is_teacher;

  if is_teacher then
    return 'is-teacher';
  end if;

  if not exists (
    select 1 from public.students s where s.user_id = uid
  ) then
    insert into public.students (user_id, teacher_id)
    values (uid, single_teacher_id);
    return 'created-and-linked';
  elsif exists (
    select 1 from public.students s where s.user_id = uid and s.teacher_id is null
  ) then
    -- Link orphan student to single teacher
    update public.students 
    set teacher_id = single_teacher_id, updated_at = now()
    where user_id = uid and teacher_id is null;
    return 'linked-to-teacher';
  end if;

  return 'exists';
end;
$$;