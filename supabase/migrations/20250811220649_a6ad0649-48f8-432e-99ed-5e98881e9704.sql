
-- 1) Marcação de cursos gratuitos
alter table public.courses
  add column if not exists is_free boolean not null default false;

-- 2) Trocar a política de leitura para cursos
drop policy if exists "Anyone can view published courses" on public.courses;

create policy "Users can view published free or enrolled courses"
on public.courses
for select
to authenticated
using (
  is_published = true
  and (
    is_free = true
    or auth.uid() = instructor
    or auth.uid() = any(enrolled_users)
  )
);
