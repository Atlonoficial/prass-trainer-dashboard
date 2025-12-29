
-- Garante que não haverá duplicatas de vínculo (mesmo aluno x professor)
create unique index if not exists uq_students_user_teacher
on public.students(user_id, teacher_id);

-- Função para o professor vincular em massa alunos já cadastrados por e-mail.
-- Para e-mails sem usuário ainda, gera convite pendente automaticamente.
create or replace function public.teacher_link_students(_emails text[])
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  e text;
  p record;
  linked int := 0;
  already int := 0;
  invited text[] := '{}';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Verifica se quem chamou é professor (pelo profile) ou admin (opcional)
  if not exists (
    select 1 from public.profiles pr
    where pr.id = uid and pr.user_type = 'teacher'
  ) and not public.has_role(uid, 'admin') then
    raise exception 'Only teachers or admins can link students';
  end if;

  foreach e in array _emails loop
    -- tenta encontrar usuário pelo e-mail
    select id, email into p
    from public.profiles
    where lower(email) = lower(e)
    limit 1;

    if not found then
      -- Sem perfil ainda: cria convite pendente para esse e-mail vinculado ao professor
      insert into public.student_invitations (email, teacher_id, code, status)
      values (e, uid, encode(gen_random_bytes(16), 'hex'), 'pending');
      invited := array_append(invited, e);
      continue;
    end if;

    -- Já existe usuário. Tenta vincular:
    if exists (
      select 1 from public.students s
      where s.user_id = p.id and s.teacher_id = uid
    ) then
      already := already + 1;
    elsif exists (
      select 1 from public.students s
      where s.user_id = p.id and s.teacher_id is null
      limit 1
    ) then
      -- Reaproveita registro "órfão" ajustando o teacher_id
      update public.students
      set teacher_id = uid, updated_at = now()
      where user_id = p.id and teacher_id is null;
      linked := linked + 1;
    else
      -- Cria o vínculo novo
      begin
        insert into public.students (user_id, teacher_id)
        values (p.id, uid);
        linked := linked + 1;
      exception when unique_violation then
        already := already + 1;
      end;
    end if;
  end loop;

  return json_build_object(
    'linked', linked,
    'already_linked', already,
    'invited_emails', invited
  );
end;
$$;
