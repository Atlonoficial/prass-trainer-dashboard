
-- 1) Tabela de convites de alunos
create table if not exists public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  teacher_id uuid not null,
  code text not null unique,
  status text not null default 'pending', -- pending | accepted | cancelled | expired
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.student_invitations enable row level security;

-- Índices úteis
create index if not exists student_invitations_email_idx
  on public.student_invitations (lower(email));
create index if not exists student_invitations_status_expires_idx
  on public.student_invitations (status, expires_at);

-- RLS: professores gerenciam seus próprios convites
create policy if not exists "Teachers can insert invitations"
  on public.student_invitations
  for insert
  to authenticated
  with check (auth.uid() = teacher_id);

create policy if not exists "Teachers can view own invitations"
  on public.student_invitations
  for select
  to authenticated
  using (auth.uid() = teacher_id);

create policy if not exists "Teachers can update own invitations"
  on public.student_invitations
  for update
  to authenticated
  using (auth.uid() = teacher_id);

create policy if not exists "Teachers can delete own invitations"
  on public.student_invitations
  for delete
  to authenticated
  using (auth.uid() = teacher_id);

-- 2) Função RPC: aceitar convite via código
create or replace function public.accept_invitation(_code text)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  uid uuid := auth.uid();
  inv record;
  prof_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv
  from public.student_invitations
  where code = _code
    and status = 'pending'
    and expires_at >= now()
  limit 1;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  -- Confirma que o e-mail do profile bate com o convite
  select email into prof_email
  from public.profiles
  where id = uid;

  if prof_email is null then
    raise exception 'Profile not found for user';
  end if;

  if lower(prof_email) <> lower(inv.email) then
    raise exception 'Invitation email does not match your account email';
  end if;

  -- Vincula ou atualiza o registro do aluno
  if exists (select 1 from public.students where user_id = uid) then
    -- Se já houver um registro, não sobrescrever caso já tenha outro professor
    update public.students
      set teacher_id = case
        when teacher_id is null or teacher_id = inv.teacher_id then inv.teacher_id
        else teacher_id
      end,
          membership_status = coalesce(membership_status, 'active'),
          updated_at = now()
    where user_id = uid;

    -- Se já havia outro professor diferente, impedir troca silenciosa
    if (select teacher_id from public.students where user_id = uid) <> inv.teacher_id then
      raise exception 'You are already linked to another teacher';
    end if;
  else
    insert into public.students (user_id, teacher_id, membership_status)
    values (uid, inv.teacher_id, 'active');
  end if;

  update public.student_invitations
    set status = 'accepted', accepted_at = now()
  where id = inv.id;

  return 'ok';
end;
$$;

-- 3) Trigger: vincular automaticamente após criar profile (signup)
create or replace function public.auto_link_student_from_invite()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  inv record;
begin
  -- Procura convite pendente mais recente para este e-mail
  select *
    into inv
  from public.student_invitations
  where lower(email) = lower(new.email)
    and status = 'pending'
    and expires_at >= now()
  order by created_at desc
  limit 1;

  if not found then
    return new;
  end if;

  -- Cria ou atualiza students (sem trocar professor se já houver outro)
  if exists (select 1 from public.students where user_id = new.id) then
    update public.students
      set teacher_id = case
        when teacher_id is null or teacher_id = inv.teacher_id then inv.teacher_id
        else teacher_id
      end,
          membership_status = coalesce(membership_status, 'active'),
          updated_at = now()
    where user_id = new.id;

    if (select teacher_id from public.students where user_id = new.id) <> inv.teacher_id then
      -- Já vinculado a outro professor; não sobrescrever
      return new;
    end if;
  else
    insert into public.students (user_id, teacher_id, membership_status)
    values (new.id, inv.teacher_id, 'active');
  end if;

  update public.student_invitations
    set status = 'accepted', accepted_at = now()
  where id = inv.id;

  return new;
end;
$$;

drop trigger if exists on_profile_insert_link_student on public.profiles;
create trigger on_profile_insert_link_student
after insert on public.profiles
for each row execute procedure public.auto_link_student_from_invite();

-- 4) Habilitar Realtime para students
alter table public.students replica identity full;
alter publication supabase_realtime add table public.students;

-- 5) Índice para acelerar listagem por professor
create index if not exists students_teacher_idx on public.students(teacher_id);
