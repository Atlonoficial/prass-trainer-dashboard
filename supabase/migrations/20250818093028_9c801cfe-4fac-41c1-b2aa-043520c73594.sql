-- Update list_available_slots_improved function to respect booking settings
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(
  p_teacher_id uuid, 
  p_start_date date, 
  p_end_date date, 
  p_slot_minutes integer DEFAULT NULL::integer
)
RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  wday int;
  is_exception boolean;
  has_special_hours boolean;
  booking_settings record;
  min_booking_time timestamptz;
  max_booking_date date;
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

  -- Get booking settings
  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_id = p_teacher_id;

  -- Set defaults if no settings found
  if not found then
    booking_settings.minimum_advance_hours := 2;
    booking_settings.visibility_days := 7;
    booking_settings.allow_same_day := false;
  end if;

  -- Calculate minimum booking time based on advance hours
  min_booking_time := now() + make_interval(hours => booking_settings.minimum_advance_hours);
  
  -- Calculate maximum booking date based on visibility days  
  max_booking_date := current_date + make_interval(days => booking_settings.visibility_days);

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
    
    -- Skip dates that are too far in advance or don't allow same day booking
    if iter_date = current_date and not booking_settings.allow_same_day then
      iter_date := iter_date + 1;
      continue;
    end if;
    
    -- Check for exceptions on this date
    select * into exception
    from public.teacher_schedule_exceptions
    where teacher_id = p_teacher_id and date = iter_date
    limit 1;
    
    if found then
      is_exception := true;
      if exception.type = 'blocked' or (exception.type = 'holiday' and not exception.is_available) then
        iter_date := iter_date + 1;
        continue;
      elsif exception.type = 'special_hours' and exception.is_available then
        has_special_hours := true;
      end if;
    end if;
    
    -- Get availability for this weekday (or use special hours)
    if has_special_hours then
      -- Use special hours from exception
      step := coalesce(p_slot_minutes, 60);
      series_start := iter_date::timestamptz + exception.special_start_time;
      series_end := iter_date::timestamptz + exception.special_end_time;
      
      for s in
        select generate_series(series_start, series_end - make_interval(mins => step), make_interval(mins => step))
      loop
        -- Check if slot meets minimum advance time requirement
        if s < min_booking_time then
          continue;
        end if;
        
        if not exists (
          select 1 from public.appointments a
          where a.teacher_id = p_teacher_id
            and coalesce(a.status, 'scheduled') <> 'cancelled'
            and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                tstzrange(s, s + make_interval(mins => step), '[)')
        ) then
          slot_date := iter_date;
          slot_start := s;
          slot_end := s + make_interval(mins => step);
          return next;
        end if;
      end loop;
    else
      -- Use regular weekly availability
      for av in
        select *
        from public.teacher_availability
        where teacher_id = p_teacher_id and weekday = wday
      loop
        step := coalesce(p_slot_minutes, av.slot_minutes, 60);
        series_start := iter_date::timestamptz + av.start_time;
        series_end := iter_date::timestamptz + av.end_time;
        
        for s in
          select generate_series(series_start, series_end - make_interval(mins => step), make_interval(mins => step))
        loop
          -- Check if slot meets minimum advance time requirement
          if s < min_booking_time then
            continue;
          end if;
          
          if not exists (
            select 1 from public.appointments a
            where a.teacher_id = p_teacher_id
              and coalesce(a.status, 'scheduled') <> 'cancelled'
              and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                  tstzrange(s, s + make_interval(mins => step), '[)')
          ) then
            slot_date := iter_date;
            slot_start := s;
            slot_end := s + make_interval(mins => step);
            return next;
          end if;
        end loop;
      end loop;
    end if;
    
    iter_date := iter_date + 1;
  end loop;
  
  return;
end;
$function$;