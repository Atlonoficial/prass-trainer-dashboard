-- 1) Utilitário seguro para checar relação professor → aluno
create or replace function public.is_teacher_of(_teacher_id uuid, _student_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.teacher_id = _teacher_id
      and s.user_id = _student_user_id
  );
$$;

-- 2) Políticas: permitir que professores vejam dados dos seus alunos
-- progress
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'progress' and policyname = 'Teachers can view students progress'
  ) then
    drop policy "Teachers can view students progress" on public.progress;
  end if;
end $$;

create policy "Teachers can view students progress"
on public.progress
for select
to authenticated
using (public.is_teacher_of(auth.uid(), user_id));

-- meal_logs
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'meal_logs' and policyname = 'Teachers can view students meal logs'
  ) then
    drop policy "Teachers can view students meal logs" on public.meal_logs;
  end if;
end $$;

create policy "Teachers can view students meal logs"
on public.meal_logs
for select
to authenticated
using (public.is_teacher_of(auth.uid(), user_id));

-- workout_sessions
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workout_sessions' and policyname = 'Teachers can view students workout sessions'
  ) then
    drop policy "Teachers can view students workout sessions" on public.workout_sessions;
  end if;
end $$;

create policy "Teachers can view students workout sessions"
on public.workout_sessions
for select
to authenticated
using (public.is_teacher_of(auth.uid(), user_id));