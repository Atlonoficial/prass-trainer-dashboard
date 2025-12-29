-- Security Fix: Add proper search_path to vulnerable database functions
-- This prevents search path manipulation attacks

-- Fix list_available_slots_improved function
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(p_teacher_id uuid, p_start_date date, p_end_date date, p_slot_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, slot_minutes integer, slot_teacher_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
  iter_date date;
  av record;
  exception record;
  step int;
  series_start timestamptz;
  series_end timestamptz;
  s timestamptz;
  slot_end_time timestamptz;
  wday int;
  is_exception boolean;
  has_special_hours boolean;
  booking_settings record;
  min_booking_time timestamptz;
  max_booking_date date;
  current_time_br timestamptz;
  teacher_timezone text := 'America/Sao_Paulo';
begin
  -- More flexible auth check - allow if user is teacher or student or null (for testing)
  if uid is not null and uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to view this teacher''s availability';
    end if;
  end if;

  -- Get current time in Brazil timezone
  current_time_br := now() AT TIME ZONE teacher_timezone;

  -- Get booking settings with logging
  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_booking_settings.teacher_id = p_teacher_id;

  -- Set defaults if no settings found
  if not found then
    booking_settings.minimum_advance_minutes := 5;
    booking_settings.visibility_days := 30;
    booking_settings.allow_same_day := true;
    raise notice 'Using default booking settings: min_advance=5min, same_day=true, visibility=30days';
  else
    raise notice 'Found booking settings: min_advance_minutes=%, same_day=%, visibility=%', 
      booking_settings.minimum_advance_minutes, 
      booking_settings.allow_same_day, 
      booking_settings.visibility_days;
  end if;

  -- Calculate minimum booking time based on advance minutes using Brazil timezone
  min_booking_time := current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes);
  raise notice 'Current time BR: %, Min booking time BR: % (advance: % minutes)', current_time_br, min_booking_time, booking_settings.minimum_advance_minutes;
  
  -- Calculate maximum booking date based on visibility days  
  max_booking_date := current_time_br::date + make_interval(days => booking_settings.visibility_days);

  -- Restrict end date to visibility window
  if p_end_date > max_booking_date then
    p_end_date := max_booking_date;
  end if;

  -- Loop through each date in the range
  iter_date := p_start_date;
  
  while iter_date <= p_end_date loop
    wday := extract(dow from iter_date);
    is_exception := false;
    has_special_hours := false;
    
    raise notice 'Processing date: %, weekday: %', iter_date, wday;
    
    -- Skip dates that are too far in advance or don't allow same day booking
    if iter_date = current_time_br::date and not booking_settings.allow_same_day then
      raise notice 'Skipping same day booking for date: %', iter_date;
      iter_date := iter_date + 1;
      continue;
    end if;
    
    -- Check for exceptions on this date
    select * into exception
    from public.teacher_schedule_exceptions
    where teacher_schedule_exceptions.teacher_id = p_teacher_id and date = iter_date
    limit 1;
    
    if found then
      is_exception := true;
      if exception.type = 'blocked' or (exception.type = 'holiday' and not exception.is_available) then
        raise notice 'Date % is blocked or unavailable holiday', iter_date;
        iter_date := iter_date + 1;
        continue;
      elsif exception.type = 'special_hours' and exception.is_available then
        has_special_hours := true;
        raise notice 'Date % has special hours', iter_date;
      end if;
    end if;
    
    -- Get availability for this weekday (or use special hours)
    if has_special_hours then
      -- Use special hours from exception
      step := coalesce(p_slot_minutes, 60);
      -- Proper timezone conversion
      series_start := (iter_date + exception.special_start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      series_end := (iter_date + exception.special_end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      
      raise notice 'Special hours: start=%, end=%, step=%', series_start, series_end, step;
      
      -- Generate slots manually with proper end time calculation
      s := series_start;
      while s + make_interval(mins => step) <= series_end loop
        slot_end_time := s + make_interval(mins => step);
        
        raise notice 'Checking special slot: % to %', s, slot_end_time;
        
        -- Check if slot meets minimum advance time requirement
        if (s AT TIME ZONE teacher_timezone) < min_booking_time then
          raise notice 'Skipping slot % - before min booking time', s;
          s := s + make_interval(mins => step);
          continue;
        end if;
        
        -- Check for non-cancelled appointments
        if not exists (
          select 1 from public.appointments a
          where a.teacher_id = p_teacher_id
            and a.status != 'cancelled'
            and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                tstzrange(s, slot_end_time, '[)')
        ) then
          slot_date := iter_date;
          slot_start := s;
          slot_end := slot_end_time;
          slot_minutes := step;
          slot_teacher_id := p_teacher_id;
          raise notice 'Returning special slot: % to %, duration: % minutes', s, slot_end_time, step;
          return next;
        else
          raise notice 'Special slot % is blocked by existing appointment', s;
        end if;
        
        s := s + make_interval(mins => step);
      end loop;
    else
      -- Use regular weekly availability
      for av in
        select *
        from public.teacher_availability ta
        where ta.teacher_id = p_teacher_id and ta.weekday = wday
      loop
        step := coalesce(p_slot_minutes, av.slot_minutes, 60);
        -- Proper timezone conversion
        series_start := (iter_date + av.start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        series_end := (iter_date + av.end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        
        raise notice 'Availability for weekday %: % to %, step=%', wday, series_start, series_end, step;
        
        -- Generate slots manually with proper end time calculation
        s := series_start;
        while s + make_interval(mins => step) <= series_end loop
          slot_end_time := s + make_interval(mins => step);
          
          raise notice 'Checking slot: % to %, min_booking_time=%', s, slot_end_time, min_booking_time;
          
          -- Check if slot meets minimum advance time requirement
          if (s AT TIME ZONE teacher_timezone) < min_booking_time then
            raise notice 'Skipping slot % - before min booking time %', s, min_booking_time;
            s := s + make_interval(mins => step);
            continue;
          end if;
          
          -- Check for non-cancelled appointments
          if not exists (
            select 1 from public.appointments a
            where a.teacher_id = p_teacher_id
              and a.status != 'cancelled'
              and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                  tstzrange(s, slot_end_time, '[)')
          ) then
            slot_date := iter_date;
            slot_start := s;
            slot_end := slot_end_time;
            slot_minutes := step;
            slot_teacher_id := p_teacher_id;
            raise notice 'Returning slot: % to %, duration: % minutes', s, slot_end_time, step;
            return next;
          else
            raise notice 'Slot % is blocked by existing appointment', s;
          end if;
          
          s := s + make_interval(mins => step);
        end loop;
      end loop;
    end if;
    
    iter_date := iter_date + 1;
  end loop;
  
  return;
end;
$function$;

-- Fix clean_old_appointments function
CREATE OR REPLACE FUNCTION public.clean_old_appointments()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Archive appointments older than 6 months
  -- This ensures we keep 3 months of active history plus 3 months buffer
  DELETE FROM public.appointments 
  WHERE scheduled_time < (now() - interval '6 months')
    AND status IN ('cancelled', 'completed');
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned old appointments older than 6 months';
END;
$function$;

-- Fix validate_appointment_time function
CREATE OR REPLACE FUNCTION public.validate_appointment_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Only validate on INSERT, not UPDATE (to allow status changes on past appointments)
  IF TG_OP = 'INSERT' THEN
    -- Allow scheduling up to 1 hour in the past (for timezone flexibility)
    IF NEW.scheduled_time < (now() - interval '1 hour') THEN
      RAISE EXCEPTION 'Cannot schedule appointments more than 1 hour in the past';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix teacher_update_student_profile function
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(p_student_user_id uuid, p_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_active_plan text DEFAULT NULL::text, p_membership_status text DEFAULT NULL::text, p_membership_expiry timestamp with time zone DEFAULT NULL::timestamp with time zone, p_goals text[] DEFAULT NULL::text[], p_mode text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure the caller is the teacher of this student
  if not public.is_teacher_of(uid, p_student_user_id) and not public.has_role(uid, 'admin'::app_role) then
    raise exception 'Not authorized to update this student';
  end if;

  -- Update profiles (optional fields)
  if p_name is not null or p_email is not null then
    update public.profiles
       set name = coalesce(p_name, name),
           email = coalesce(p_email, email),
           updated_at = now()
     where id = p_student_user_id;
  end if;

  -- Update students row tied to this user and teacher
  update public.students s
     set active_plan = coalesce(p_active_plan, s.active_plan),
         membership_status = coalesce(p_membership_status, s.membership_status),
         membership_expiry = coalesce(p_membership_expiry, s.membership_expiry),
         goals = coalesce(p_goals, s.goals),
         mode = coalesce(p_mode, s.mode),
         updated_at = now()
   where s.user_id = p_student_user_id
     and (s.teacher_id = uid or public.has_role(uid, 'admin'::app_role));

  return 'ok';
end; 
$function$;

-- Fix log_security_activity function
CREATE OR REPLACE FUNCTION public.log_security_activity(p_user_id uuid, p_activity_type text, p_activity_description text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_device_info jsonb DEFAULT '{}'::jsonb, p_success boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_activity_log (
    user_id,
    activity_type,
    activity_description,
    ip_address,
    user_agent,
    device_info,
    success
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_activity_description,
    p_ip_address,
    p_user_agent,
    p_device_info,
    p_success
  );
END;
$function$;

-- Fix generate_backup_codes function
CREATE OR REPLACE FUNCTION public.generate_backup_codes()
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  codes text[] := '{}';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    codes := array_append(codes, upper(encode(gen_random_bytes(4), 'hex')));
  END LOOP;
  RETURN codes;
END;
$function$;

-- Fix update_session_activity function
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.user_sessions 
  SET last_activity = now()
  WHERE session_token = p_session_token AND is_active = true;
END;
$function$;

-- Fix log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, record_id uuid, access_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log sensitive data access attempts
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    record_id,
    access_type,
    timestamp
  ) VALUES (
    auth.uid(),
    table_name,
    record_id,
    access_type,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail silently to not break main functionality
  NULL;
END;
$function$;

-- Fix validate_input function
CREATE OR REPLACE FUNCTION public.validate_input(input_text text, max_length integer DEFAULT 1000, allow_html boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Basic validation
  IF input_text IS NULL OR LENGTH(input_text) > max_length THEN
    RETURN FALSE;
  END IF;
  
  -- Check for potential XSS if HTML not allowed
  IF NOT allow_html AND (
    input_text ILIKE '%<script%' OR
    input_text ILIKE '%javascript:%' OR
    input_text ILIKE '%on%=%' OR
    input_text ILIKE '%data:text/html%'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix book_appointment function
CREATE OR REPLACE FUNCTION public.book_appointment(p_teacher_id uuid, p_scheduled_time timestamp with time zone, p_type text DEFAULT 'class'::text, p_duration integer DEFAULT NULL::integer, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_student_title text DEFAULT NULL::text, p_student_objectives text DEFAULT NULL::text, p_student_notes text DEFAULT NULL::text, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  uid uuid := auth.uid();
  slot_ok boolean := false;
  new_id uuid;
  step int := coalesce(p_duration, 60);
  slot_end timestamptz := p_scheduled_time + make_interval(mins => step);
  the_date date := (p_scheduled_time at time zone 'America/Sao_Paulo')::date;
  slot record;
  booking_settings record;
  current_time_br timestamptz;
  teacher_timezone text := 'America/Sao_Paulo';
  appointment_status text := 'scheduled';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to book with this teacher';
    end if;
  end if;

  current_time_br := now() AT TIME ZONE teacher_timezone;

  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_booking_settings.teacher_id = p_teacher_id;

  if not found then
    booking_settings.minimum_advance_minutes := 5;
    booking_settings.visibility_days := 30;
    booking_settings.allow_same_day := true;
    booking_settings.auto_confirm := false;
  end if;

  if (p_scheduled_time AT TIME ZONE teacher_timezone) < (current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes)) then
    raise exception 'Booking time is too close to current time. Minimum advance: % minutes', booking_settings.minimum_advance_minutes;
  end if;

  if the_date = current_time_br::date and not booking_settings.allow_same_day then
    raise exception 'Same day booking is not allowed';
  end if;

  if booking_settings.auto_confirm = true then
    appointment_status := 'confirmed';
  else
    appointment_status := 'scheduled';
  end if;

  for slot in
    select * from public.list_available_slots_improved(p_teacher_id, the_date, the_date, step)
  loop
    if slot.slot_start = p_scheduled_time and slot.slot_end = slot_end then
      slot_ok := true;
      exit;
    end if;
  end loop;

  if not slot_ok then
    raise exception 'Selected time is not available';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.teacher_id = p_teacher_id
      and a.status != 'cancelled'
      and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
          tstzrange(p_scheduled_time, slot_end, '[)')
  ) then
    raise exception 'Selected time is not available';
  end if;

  insert into public.appointments (
    id, teacher_id, student_id, scheduled_time, duration, status, type, title, description,
    student_title, student_objectives, student_notes, location_id
  ) values (
    extensions.uuid_generate_v4(), p_teacher_id, uid, p_scheduled_time, step, appointment_status, p_type,
    coalesce(p_title, case when p_type = 'assessment' then 'Avaliação' else 'Aula' end),
    p_description, p_student_title, p_student_objectives, p_student_notes, p_location_id
  ) returning id into new_id;

  return new_id;
end;
$function$;

-- Fix update_notification_logs_updated_at function
CREATE OR REPLACE FUNCTION public.update_notification_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_type text, max_attempts integer DEFAULT 5, time_window interval DEFAULT '01:00:00'::interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts for this user and operation
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.rate_limit_log
  WHERE user_id = auth.uid()
    AND operation_type = check_rate_limit.operation_type
    AND created_at > (NOW() - time_window);
  
  -- Log this attempt
  INSERT INTO public.rate_limit_log (user_id, operation_type)
  VALUES (auth.uid(), operation_type);
  
  -- Return whether under limit
  RETURN attempt_count < max_attempts;
EXCEPTION WHEN OTHERS THEN
  -- On error, allow the operation but log it
  RETURN TRUE;
END;
$function$;

-- Fix cleanup_rate_limit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$function$;