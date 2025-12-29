-- Security fixes: set stable search_path for functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.can_insert_notification(targets uuid[])
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    return false;
  end if;

  foreach target in array targets loop
    -- Pode enviar para si
    if target = uid then
      continue;
    end if;

    -- Ou para aluno próprio (students.teacher_id = uid)
    if not exists (
      select 1
      from public.students s
      where s.user_id = target
        and s.teacher_id = uid
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;