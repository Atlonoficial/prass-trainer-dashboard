-- Add auto_confirm field to teacher_booking_settings
ALTER TABLE public.teacher_booking_settings 
ADD COLUMN auto_confirm boolean NOT NULL DEFAULT false;

-- Update book_appointment function to respect auto_confirm setting
CREATE OR REPLACE FUNCTION public.book_appointment(p_teacher_id uuid, p_scheduled_time timestamp with time zone, p_type text DEFAULT 'class'::text, p_duration integer DEFAULT NULL::integer, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_student_title text DEFAULT NULL::text, p_student_objectives text DEFAULT NULL::text, p_student_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  appointment_status text := 'scheduled'; -- Default to scheduled (needs confirmation)
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Allow teacher or their assigned students to book; most common path is student booking
  if uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to book with this teacher';
    end if;
  end if;

  -- Get current time in Brazil timezone (same as list_available_slots_improved)
  current_time_br := now() AT TIME ZONE teacher_timezone;

  -- Get booking settings with logging
  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_booking_settings.teacher_id = p_teacher_id;

  -- Set defaults if no settings found (same as list_available_slots_improved)
  if not found then
    booking_settings.minimum_advance_minutes := 5;
    booking_settings.visibility_days := 30;
    booking_settings.allow_same_day := true;
    booking_settings.auto_confirm := false; -- Default to manual confirmation
  end if;

  -- Check minimum advance time requirement using Brazil timezone (same validation as list function)
  if (p_scheduled_time AT TIME ZONE teacher_timezone) < (current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes)) then
    raise exception 'Booking time is too close to current time. Minimum advance: % minutes', booking_settings.minimum_advance_minutes;
  end if;

  -- Check same day booking restriction (same as list function)
  if the_date = current_time_br::date and not booking_settings.allow_same_day then
    raise exception 'Same day booking is not allowed';
  end if;

  -- Set appointment status based on auto_confirm setting
  if booking_settings.auto_confirm = true then
    appointment_status := 'confirmed';
  else
    appointment_status := 'scheduled'; -- Requires manual confirmation
  end if;

  -- Use improved slot validation by actually calling list_available_slots_improved
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

  -- Double-check for race conditions: ensure no conflicting appointment exists right now
  if exists (
    select 1 from public.appointments a
    where a.teacher_id = p_teacher_id
      and a.status != 'cancelled'
      and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
          tstzrange(p_scheduled_time, slot_end, '[)')
  ) then
    raise exception 'Selected time is not available';
  end if;

  -- Insert appointment with correct status based on auto_confirm setting
  insert into public.appointments (
    id, teacher_id, student_id, scheduled_time, duration, status, type, title, description,
    student_title, student_objectives, student_notes
  ) values (
    extensions.uuid_generate_v4(), p_teacher_id, uid, p_scheduled_time, step, appointment_status, p_type,
    coalesce(p_title, case when p_type = 'assessment' then 'Avaliação' else 'Aula' end),
    p_description, p_student_title, p_student_objectives, p_student_notes
  ) returning id into new_id;

  return new_id;
end;
$function$