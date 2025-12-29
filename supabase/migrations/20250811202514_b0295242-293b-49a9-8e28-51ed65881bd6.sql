-- Student Invitations and Auto-Linking Migration
-- 1) Table: student_invitations
create table if not exists public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text not null,
  teacher_id uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  student_user_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

-- 
-- 2) RLS policies for student_invitations
alter table public.student_invitations enable row level security;

-- Teachers can insert their own invitations
create policy if not exists "Teachers can insert invitations" on public.student_invitations
for insert to authenticated
with check (auth.uid() = teacher_id);

-- Teachers can update their own invitations
create policy if not exists "Teachers can update invitations" on public.student_invitations
for update to authenticated
using (auth.uid() = teacher_id);

-- Teachers can view their own invitations
create policy if not exists "Teachers can view invitations" on public.student_invitations
for select to authenticated
using (auth.uid() = teacher_id);

-- Optional indexes
create index if not exists idx_student_invitations_email on public.student_invitations (lower(email));
create index if not exists idx_student_invitations_teacher on public.student_invitations (teacher_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_student_invitations_updated_at on public.student_invitations;
create trigger trg_student_invitations_updated_at
before update on public.student_invitations
for each row execute function public.set_updated_at();

-- 3) RPC: accept_invitation(code)
create or replace function public.accept_invitation(code text)
returns text
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  uid uuid := auth.uid();
  inv record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv
  from public.student_invitations i
  where i.code = accept_invitation.code
    and i.status = 'pending'
    and i.expires_at >= now()
  order by i.created_at desc
  limit 1;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  -- Optionally enforce email match if profile exists
  -- If a profile exists and email differs, block acceptance
  perform 1 from public.profiles p where p.id = uid and lower(p.email) = lower(inv.email);
  if not found then
    -- If profile not found, allow acceptance. If found with different email, fail.
    -- Check if a profile exists at all
    if exists (select 1 from public.profiles p2 where p2.id = uid) then
      raise exception 'Invitation email does not match your account email';
    end if;
  end if;

  -- Link student to teacher only if not already linked
  if not exists (
    select 1 from public.students s
    where s.user_id = uid and s.teacher_id = inv.teacher_id
  ) then
    insert into public.students (user_id, teacher_id)
    values (uid, inv.teacher_id);
  end if;

  update public.student_invitations
    set status = 'accepted', accepted_at = now(), student_user_id = uid
  where id = inv.id;

  return 'ok';
end;
$$;

-- 4) Auto-link on signup based on email
create or replace function public.handle_invitation_on_signup()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  inv record;
begin
  -- Try to find a pending invitation matching the new user's email
  select * into inv
  from public.student_invitations i
  where lower(i.email) = lower(new.email)
    and i.status = 'pending'
    and i.expires_at >= now()
  order by i.created_at desc
  limit 1;

  if found then
    -- Create profile if not exists (in case other trigger failed)
    insert into public.profiles (id, email, name, user_type)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), coalesce(new.raw_user_meta_data->>'user_type', 'student'))
    on conflict (id) do nothing;

    -- Link student to teacher if not already linked
    if not exists (
      select 1 from public.students s where s.user_id = new.id and s.teacher_id = inv.teacher_id
    ) then
      insert into public.students (user_id, teacher_id)
      values (new.id, inv.teacher_id);
    end if;

    update public.student_invitations
      set status = 'accepted', accepted_at = now(), student_user_id = new.id
    where id = inv.id;
  end if;

  return new;
end;
$$;

-- Ensure profiles trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Create invitation auto-link trigger
drop trigger if exists on_auth_user_created_link_invitation on auth.users;
create trigger on_auth_user_created_link_invitation
after insert on auth.users
for each row execute function public.handle_invitation_on_signup();

-- 5) Improve realtime payloads
alter table public.students replica identity full;