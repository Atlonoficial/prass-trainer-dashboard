-- Ensure function to auto-create a student record for logged-in users
create or replace function public.ensure_student_record()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
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
    values (uid, null);
    return 'created';
  end if;

  return 'exists';
end;
$$;

-- Admins can view all students
create policy "Admins can view all students"
  on public.students
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- Ensure full row data for realtime updates
alter table public.students replica identity full;
