-- 1) Function to ensure a student record exists for the logged-in user
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

  -- If user profile exists and is teacher, do nothing
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.user_type = 'teacher'
  ) into is_teacher;

  if is_teacher then
    return 'is-teacher';
  end if;

  -- Create a students row if none exists for this user
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

-- 2) RLS: allow admins to view all students
-- Create policy if not exists pattern via DO block
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'students' and policyname = 'Admins can view all students'
  ) then
    execute $$
      create policy "Admins can view all students"
      on public.students
      for select
      using (public.has_role(auth.uid(), 'admin'))
    $$;
  end if;
end $$;

-- 3) RLS: allow admins to view all profiles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can view all profiles'
  ) then
    execute $$
      create policy "Admins can view all profiles"
      on public.profiles
      for select
      using (public.has_role(auth.uid(), 'admin'))
    $$;
  end if;
end $$;

-- 4) Realtime support (optional but safe): ensure students table is in publication and identity full
alter table public.students replica identity full;
-- Add to publication if needed (no-op if already present)
alter publication supabase_realtime add table if not exists public.students;
