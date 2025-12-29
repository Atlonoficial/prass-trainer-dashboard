-- Create table for teacher schedule exceptions (holidays, blocked days, etc.)
CREATE TABLE public.teacher_schedule_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'blocked', 'special_hours')),
  reason TEXT,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  special_start_time TIME,
  special_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(teacher_id, date)
);

-- Enable RLS
ALTER TABLE public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can manage own exceptions" 
ON public.teacher_schedule_exceptions 
FOR ALL 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view teacher exceptions" 
ON public.teacher_schedule_exceptions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.students s 
  WHERE s.user_id = auth.uid() AND s.teacher_id = teacher_schedule_exceptions.teacher_id
));

-- Create updated_at trigger
CREATE TRIGGER update_teacher_schedule_exceptions_updated_at
  BEFORE UPDATE ON public.teacher_schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Improve the list_available_slots function to handle exceptions and future dates
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(
  p_teacher_id uuid, 
  p_start_date date, 
  p_end_date date,
  p_slot_minutes integer DEFAULT NULL
) 
RETURNS TABLE(
  slot_date date,
  slot_start timestamp with time zone, 
  slot_end timestamp with time zone
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  current_date date;
  av record;
  exception record;
  step int;
  series_start timestamptz;
  series_end timestamptz;
  s timestamptz;
  wday int;
  is_exception boolean;
  has_special_hours boolean;
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

  -- Loop through each date in the range
  current_date := p_start_date;
  
  while current_date <= p_end_date loop
    wday := extract(dow from current_date);
    is_exception := false;
    has_special_hours := false;
    
    -- Check for exceptions on this date
    select * into exception
    from public.teacher_schedule_exceptions
    where teacher_id = p_teacher_id and date = current_date
    limit 1;
    
    if found then
      is_exception := true;
      if exception.type = 'blocked' or (exception.type = 'holiday' and not exception.is_available) then
        current_date := current_date + 1;
        continue;
      elsif exception.type = 'special_hours' and exception.is_available then
        has_special_hours := true;
      end if;
    end if;
    
    -- Get availability for this weekday (or use special hours)
    if has_special_hours then
      -- Use special hours from exception
      step := coalesce(p_slot_minutes, 60);
      series_start := current_date::timestamptz + exception.special_start_time;
      series_end := current_date::timestamptz + exception.special_end_time;
      
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
          slot_date := current_date;
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
        series_start := current_date::timestamptz + av.start_time;
        series_end := current_date::timestamptz + av.end_time;
        
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
            slot_date := current_date;
            slot_start := s;
            slot_end := s + make_interval(mins => step);
            return next;
          end if;
        end loop;
      end loop;
    end if;
    
    current_date := current_date + 1;
  end loop;
  
  return;
end;
$function$;