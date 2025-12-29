-- Renomear coluna minimum_advance_hours para minimum_advance_minutes e converter dados existentes
ALTER TABLE teacher_booking_settings 
RENAME COLUMN minimum_advance_hours TO minimum_advance_minutes;

-- Converter valores existentes de horas para minutos (assumindo que eram horas)
UPDATE teacher_booking_settings 
SET minimum_advance_minutes = minimum_advance_minutes * 60 
WHERE minimum_advance_minutes < 100; -- Só converter valores que parecem ser horas

-- Atualizar função para usar minimum_advance_minutes
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(p_teacher_id uuid, p_start_date date, p_end_date date, p_slot_minutes integer DEFAULT NULL::integer)
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
  slot_end_time timestamptz;
  wday int;
  is_exception boolean;
  has_special_hours boolean;
  booking_settings record;
  min_booking_time timestamptz;
  max_booking_date date;
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

  -- Get booking settings with logging
  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_id = p_teacher_id;

  -- Set defaults if no settings found
  if not found then
    booking_settings.minimum_advance_minutes := 120; -- 2 horas em minutos
    booking_settings.visibility_days := 7;
    booking_settings.allow_same_day := false;
    raise notice 'Using default booking settings';
  else
    raise notice 'Found booking settings: min_advance_minutes=%, same_day=%, visibility=%', 
      booking_settings.minimum_advance_minutes, 
      booking_settings.allow_same_day, 
      booking_settings.visibility_days;
  end if;

  -- Calculate minimum booking time based on advance minutes
  min_booking_time := now() + make_interval(mins => booking_settings.minimum_advance_minutes);
  raise notice 'Current time: %, Min booking time: % (advance: % minutes)', now(), min_booking_time, booking_settings.minimum_advance_minutes;
  
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
    
    raise notice 'Processing date: %, weekday: %', iter_date, wday;
    
    -- Skip dates that are too far in advance or don't allow same day booking
    if iter_date = current_date and not booking_settings.allow_same_day then
      raise notice 'Skipping same day booking for date: %', iter_date;
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
      series_start := iter_date::timestamptz + exception.special_start_time;
      series_end := iter_date::timestamptz + exception.special_end_time;
      
      raise notice 'Special hours: start=%, end=%, step=%', series_start, series_end, step;
      
      -- Generate slots manually with proper end time calculation
      s := series_start;
      while s + make_interval(mins => step) <= series_end loop
        slot_end_time := s + make_interval(mins => step);
        
        raise notice 'Checking special slot: % to %', s, slot_end_time;
        
        -- Check if slot meets minimum advance time requirement
        if s < min_booking_time then
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
          raise notice 'Returning special slot: % to %', s, slot_end_time;
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
        from public.teacher_availability
        where teacher_id = p_teacher_id and weekday = wday
      loop
        step := coalesce(p_slot_minutes, av.slot_minutes, 60);
        series_start := iter_date::timestamptz + av.start_time;
        series_end := iter_date::timestamptz + av.end_time;
        
        raise notice 'Availability for weekday %: % to %, step=%', wday, series_start, series_end, step;
        
        -- Generate slots manually with proper end time calculation
        s := series_start;
        while s + make_interval(mins => step) <= series_end loop
          slot_end_time := s + make_interval(mins => step);
          
          raise notice 'Checking slot: % to %, min_booking_time=%', s, slot_end_time, min_booking_time;
          
          -- Check if slot meets minimum advance time requirement
          if s < min_booking_time then
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
            raise notice 'Returning slot: % to %', s, slot_end_time;
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
$function$