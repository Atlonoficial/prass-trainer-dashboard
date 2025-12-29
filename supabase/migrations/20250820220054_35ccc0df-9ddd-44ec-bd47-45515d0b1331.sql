-- Security Fix: Final security hardening

-- Fix remaining functions that might have search path issues
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid, p_teacher_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  ent jsonb := jsonb_build_object('plan', 'free', 'features', '[]'::jsonb);
  sub record;
BEGIN
  SELECT s.*, c.name, c.features
  INTO sub
  FROM public.plan_subscriptions s
  JOIN public.plan_catalog c ON c.id = s.plan_id
  WHERE s.student_user_id = p_user_id
    AND s.teacher_id = p_teacher_id
    AND s.status = 'active'
    AND (s.end_at IS NULL OR s.end_at > now())
  ORDER BY s.start_at DESC
  LIMIT 1;

  IF FOUND THEN
    ent := jsonb_build_object('plan', sub.name, 'features', sub.features);
  END IF;

  RETURN ent;
END;
$function$;

-- Fix trigger_sync_membership function
CREATE OR REPLACE FUNCTION public.trigger_sync_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  PERFORM public.sync_student_membership(NEW.student_user_id, NEW.teacher_id);
  RETURN NEW;
END;
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT exists (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- Fix is_teacher_of function
CREATE OR REPLACE FUNCTION public.is_teacher_of(_teacher_id uuid, _student_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  select exists (
    select 1
    from public.students s
    where s.teacher_id = _teacher_id
      and s.user_id = _student_user_id
  );
$function$;

-- Fix can_insert_notification function
CREATE OR REPLACE FUNCTION public.can_insert_notification(targets uuid[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix redeem_reward function
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
  needed integer;
  stock_left integer;
  has_stock boolean := true;
  current_points integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select points_cost, coalesce(stock, -1) into needed, stock_left
  from public.rewards_items
  where id = _reward_id and is_active = true;

  if not found then
    raise exception 'Reward not found or inactive';
  end if;

  if stock_left = 0 then
    raise exception 'Out of stock';
  end if;

  select total_points into current_points
  from public.user_points
  where user_id = uid;

  if current_points is null then
    current_points := 0;
  end if;

  if current_points < needed then
    raise exception 'Insufficient points';
  end if;

  -- Deduct points (upsert if row exists)
  update public.user_points
    set total_points = total_points - needed, updated_at = now()
  where user_id = uid;

  if not found then
    -- Create points row then error for insufficient points (should not happen)
    insert into public.user_points(user_id, total_points) values (uid, 0);
    raise exception 'Insufficient points';
  end if;

  -- Create redemption record
  insert into public.reward_redemptions (user_id, reward_id, points_spent, status)
  values (uid, _reward_id, needed, 'pending');

  -- Decrease stock if controlled
  if stock_left > -1 then
    update public.rewards_items set stock = stock - 1 where id = _reward_id;
  end if;

  return 'ok';
end;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
  perform 1 from public.profiles p where p.id = uid and lower(p.email) = lower(inv.email);
  if not found then
    if exists (select 1 from public.profiles p2 where p2.id = uid) then
      raise exception 'Invitation email does not match your account email';
    end if;
  end if;

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
$function$;

-- Fix handle_invitation_on_signup function
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  inv record;
begin
  select * into inv
  from public.student_invitations i
  where lower(i.email) = lower(new.email)
    and i.status = 'pending'
    and i.expires_at >= now()
  order by i.created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, email, name, user_type)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), coalesce(new.raw_user_meta_data->>'user_type', 'student'))
    on conflict (id) do nothing;

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
$function$;

-- Fix teacher_link_students function
CREATE OR REPLACE FUNCTION public.teacher_link_students(_emails text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix ensure_student_record function
CREATE OR REPLACE FUNCTION public.ensure_student_record()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix list_available_slots function
CREATE OR REPLACE FUNCTION public.list_available_slots(p_teacher_id uuid, p_date date, p_slot_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
  wday int := extract(dow from p_date);
  av record;
  step int;
  series_start timestamptz;
  series_end timestamptz;
  s timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Allow teacher or their assigned students
  if uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to view this teacher''s availability';
    end if;
  end if;

  for av in
    select *
    from public.teacher_availability
    where teacher_id = p_teacher_id and weekday = wday
  loop
    step := coalesce(p_slot_minutes, av.slot_minutes, 60);

    -- Build day timestamps in UTC; adjust per project needs if timezones are introduced later
    series_start := (p_date::timestamptz + av.start_time);
    series_end   := (p_date::timestamptz + av.end_time);

    for s in
      select generate_series(series_start, series_end - make_interval(mins => step), make_interval(mins => step))
    loop
      if not exists (
        select 1 from public.appointments a
        where a.teacher_id = p_teacher_id
          and coalesce(a.status, 'scheduled') <> 'cancelled'
          and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
              tstzrange(s, s + make_interval(mins => step), '[)')
      ) then
        slot_start := s;
        slot_end := s + make_interval(mins => step);
        return next;
      end if;
    end loop;
  end loop;

  return;
end;
$function$;

-- Fix sync_student_membership function
CREATE OR REPLACE FUNCTION public.sync_student_membership(p_student_user_id uuid, p_teacher_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  cur record;
  plan_name text := 'free';
BEGIN
  SELECT s.*, c.name AS plan_name
  INTO cur
  FROM public.plan_subscriptions s
  JOIN public.plan_catalog c ON c.id = s.plan_id
  WHERE s.student_user_id = p_student_user_id
    AND s.teacher_id = p_teacher_id
    AND s.status = 'active'
    AND (s.end_at IS NULL OR s.end_at > now())
  ORDER BY s.start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.students st
      SET active_plan = 'free', membership_status = 'active', updated_at = now()
      WHERE st.user_id = p_student_user_id AND st.teacher_id = p_teacher_id;
    RETURN 'free';
  END IF;

  plan_name := cur.plan_name;
  UPDATE public.students st
    SET active_plan = plan_name, membership_status = 'active', updated_at = now()
    WHERE st.user_id = p_student_user_id AND st.teacher_id = p_teacher_id;

  RETURN plan_name;
END;
$function$;

-- Enhance RLS policies for better security
-- Add stricter RLS policy for user_roles to prevent self-role modification
DROP POLICY IF EXISTS "Users cannot modify their own roles" ON public.user_roles;
CREATE POLICY "Users cannot modify their own roles" 
ON public.user_roles 
FOR UPDATE 
USING (false);

-- Add RLS policy to prevent users from deleting their own roles
DROP POLICY IF EXISTS "Users cannot delete their own roles" ON public.user_roles;
CREATE POLICY "Users cannot delete their own roles" 
ON public.user_roles 
FOR DELETE 
USING (false);

-- Add RLS policy for sensitive data audit logging
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enhance security activity log policies
DROP POLICY IF EXISTS "Users can view own security activities" ON public.security_activity_log;
CREATE POLICY "Users can view own security activities" 
ON public.security_activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add automatic cleanup trigger for rate limit logs
CREATE OR REPLACE FUNCTION public.trigger_cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Clean up rate limit logs older than 24 hours
  DELETE FROM public.rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$function$;

-- Create a scheduled job to clean rate limit logs (this would typically be done via pg_cron but we'll document it)
COMMENT ON FUNCTION public.trigger_cleanup_rate_limits() IS 'This function should be called periodically to clean up old rate limit logs. Consider setting up a pg_cron job or external scheduler.';