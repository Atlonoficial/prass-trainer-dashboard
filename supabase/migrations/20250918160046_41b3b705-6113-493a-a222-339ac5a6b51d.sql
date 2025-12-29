-- SECURITY FIX Phase 3: Fix remaining database functions with secure search_path

-- Update book_appointment function (it has two versions, updating both)
CREATE OR REPLACE FUNCTION public.book_appointment(p_teacher_id uuid, p_scheduled_time timestamp with time zone, p_type text DEFAULT 'class'::text, p_duration integer DEFAULT NULL::integer, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_student_title text DEFAULT NULL::text, p_student_objectives text DEFAULT NULL::text, p_student_notes text DEFAULT NULL::text, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Update get_teacher_metrics function
CREATE OR REPLACE FUNCTION public.get_teacher_metrics(p_teacher_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(paid_count bigint, pending_count bigint, failed_count bigint, total_revenue numeric, month date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    -- If teacher_id not specified, use current user
    IF p_teacher_id IS NULL THEN
        p_teacher_id := auth.uid();
    END IF;
    
    -- Check if is teacher and if accessing their own data
    IF NOT is_teacher(auth.uid()) OR (p_teacher_id != auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT 
        tm.paid_count,
        tm.pending_count,
        tm.failed_count,
        tm.total_revenue,
        tm.month::date
    FROM public.teacher_payment_metrics tm
    WHERE tm.teacher_id = p_teacher_id
    ORDER BY tm.month DESC;
END;
$function$;

-- Update teacher_update_student_profile function
CREATE OR REPLACE FUNCTION public.teacher_update_student_profile(p_student_user_id uuid, p_name text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_active_plan text DEFAULT NULL::text, p_membership_status text DEFAULT NULL::text, p_membership_expiry timestamp with time zone DEFAULT NULL::timestamp with time zone, p_goals text[] DEFAULT NULL::text[], p_mode text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Add security monitoring table for enhanced tracking if not exists
CREATE TABLE IF NOT EXISTS public.security_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  ip_address INET,
  device_info JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security_activities if not already enabled
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_activities'
  ) THEN
    ALTER TABLE public.security_activities ENABLE ROW LEVEL SECURITY;
    
    -- Policy for security activities - users can only see their own
    CREATE POLICY "Users can view own security activities" ON public.security_activities
    FOR SELECT USING (auth.uid() = user_id);

    -- Policy for inserting security activities
    CREATE POLICY "Users can log own security activities" ON public.security_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;