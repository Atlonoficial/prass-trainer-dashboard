-- Criar tabela para controle de permissões de conteúdo
CREATE TABLE IF NOT EXISTS public.student_content_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  content_id TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, teacher_id, content_id)
);

-- Habilitar RLS
ALTER TABLE public.student_content_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Students can view own content permissions"
  ON public.student_content_permissions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() 
      AND s.user_id = student_content_permissions.student_id
      AND s.teacher_id = student_content_permissions.teacher_id
  ));

CREATE POLICY "Teachers can manage student content permissions"
  ON public.student_content_permissions
  FOR ALL
  USING (auth.uid() = teacher_id);

-- Atualizar função accept_invitation para processar metadata completo
CREATE OR REPLACE FUNCTION public.accept_invitation(code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
  inv record;
  student_record record;
  content_id text;
  plan_info record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Buscar convite válido
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

  -- Verificar compatibilidade de email (opcional)
  perform 1 from public.profiles p where p.id = uid and lower(p.email) = lower(inv.email);
  if not found then
    if exists (select 1 from public.profiles p2 where p2.id = uid) then
      raise exception 'Invitation email does not match your account email';
    end if;
  end if;

  -- Buscar informações do plano selecionado
  if inv.metadata ? 'selectedPlan' then
    select * into plan_info
    from public.plan_catalog pc
    where pc.id = (inv.metadata->>'selectedPlan')::uuid
      and pc.teacher_id = inv.teacher_id
      and pc.is_active = true;
  end if;

  -- Criar ou atualizar registro do estudante com dados completos
  insert into public.students (
    user_id, 
    teacher_id,
    active_plan,
    goals,
    weight,
    height,
    mode,
    birth_date,
    membership_status,
    membership_expiry
  ) values (
    uid, 
    inv.teacher_id,
    coalesce(plan_info.name, 'free'),
    case when inv.metadata ? 'goal' and (inv.metadata->>'goal') != '' 
         then array[inv.metadata->>'goal'] 
         else array[]::text[] end,
    case when inv.metadata ? 'weight' and (inv.metadata->>'weight') != 'null'
         then (inv.metadata->>'weight')::numeric 
         else null end,
    case when inv.metadata ? 'height' and (inv.metadata->>'height') != 'null'
         then (inv.metadata->>'height')::numeric 
         else null end,
    coalesce(inv.metadata->>'modality', 'Online'),
    case when inv.metadata ? 'birthDate' and (inv.metadata->>'birthDate') != '' 
         then (inv.metadata->>'birthDate')::date 
         else null end,
    'active',
    case when inv.metadata ? 'endDate' and (inv.metadata->>'endDate') != ''
         then (inv.metadata->>'endDate')::timestamp with time zone
         else now() + interval '30 days' end
  )
  on conflict (user_id, teacher_id) do update set
    active_plan = excluded.active_plan,
    goals = excluded.goals,
    weight = excluded.weight,
    height = excluded.height,
    mode = excluded.mode,
    birth_date = excluded.birth_date,
    membership_status = excluded.membership_status,
    membership_expiry = excluded.membership_expiry,
    updated_at = now();

  -- Aplicar permissões de conteúdo selecionadas
  if inv.metadata ? 'selectedContents' then
    -- Limpar permissões existentes para este aluno/professor
    delete from public.student_content_permissions
    where student_id = uid and teacher_id = inv.teacher_id;
    
    -- Adicionar novas permissões
    for content_id in 
      select jsonb_array_elements_text(inv.metadata->'selectedContents')
    loop
      insert into public.student_content_permissions (
        student_id, teacher_id, content_id
      ) values (
        uid, inv.teacher_id, content_id
      ) on conflict (student_id, teacher_id, content_id) do nothing;
    end loop;
  end if;

  -- Atualizar perfil do usuário com dados pessoais
  if inv.metadata ? 'name' then
    update public.profiles 
    set 
      name = inv.metadata->>'name',
      updated_at = now()
    where id = uid;
  end if;

  -- Marcar convite como aceito
  update public.student_invitations
    set status = 'accepted', 
        accepted_at = now(), 
        student_user_id = uid
  where id = inv.id;

  return 'ok';
end;
$function$;

-- Função para verificar permissões de conteúdo
CREATE OR REPLACE FUNCTION public.user_has_content_access(p_content_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.student_content_permissions scp
    JOIN public.students s ON s.user_id = scp.student_id AND s.teacher_id = scp.teacher_id
    WHERE scp.student_id = auth.uid() 
      AND scp.content_id = p_content_id
  );
$function$;