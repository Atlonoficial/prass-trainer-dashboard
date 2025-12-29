-- ===================================================
-- CRIAR FUNÇÃO: list_available_slots_improved
-- E DEPENDÊNCIAS
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- 1. Criar tabela teacher_schedule_exceptions (se não existir)
CREATE TABLE IF NOT EXISTS public.teacher_schedule_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'blocked' CHECK (type IN ('blocked', 'holiday', 'special_hours')),
  title TEXT,
  is_available BOOLEAN NOT NULL DEFAULT false,
  special_start_time TIME,
  special_end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);

-- 2. Enable RLS
ALTER TABLE public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies para teacher_schedule_exceptions
DROP POLICY IF EXISTS "Teachers can manage own schedule exceptions" ON public.teacher_schedule_exceptions;
DROP POLICY IF EXISTS "Students can view teacher schedule exceptions" ON public.teacher_schedule_exceptions;

CREATE POLICY "Teachers can manage own schedule exceptions"
ON public.teacher_schedule_exceptions
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view teacher schedule exceptions"
ON public.teacher_schedule_exceptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = teacher_schedule_exceptions.teacher_id
    AND s.user_id = auth.uid()
  )
);

-- 4. Criar tabela appointments (se não existir)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  type TEXT NOT NULL DEFAULT 'class',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  title TEXT,
  description TEXT,
  student_title TEXT,
  student_objectives TEXT,
  student_notes TEXT,
  location TEXT,
  is_manual_creation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_id ON public.appointments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON public.appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_time ON public.appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 6. Enable RLS para appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies para appointments
DROP POLICY IF EXISTS "Teachers can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can view own appointments" ON public.appointments;

CREATE POLICY "Teachers can manage own appointments"
ON public.appointments
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = student_id);

-- 8. Criar função list_available_slots_improved
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(
  p_teacher_id uuid, 
  p_start_date date, 
  p_end_date date, 
  p_slot_minutes integer DEFAULT NULL::integer
)
RETURNS TABLE(
  slot_date date, 
  slot_start timestamp with time zone, 
  slot_end timestamp with time zone, 
  slot_minutes integer, 
  slot_teacher_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  end if;

  -- Calculate minimum booking time based on advance minutes using Brazil timezone
  min_booking_time := current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes);
  
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
    
    -- Skip dates that are too far in advance or don't allow same day booking
    if iter_date = current_time_br::date and not booking_settings.allow_same_day then
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
      -- Proper timezone conversion
      series_start := (iter_date + exception.special_start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      series_end := (iter_date + exception.special_end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      
      -- Generate slots manually with proper end time calculation
      s := series_start;
      while s + make_interval(mins => step) <= series_end loop
        slot_end_time := s + make_interval(mins => step);
        
        -- Check if slot meets minimum advance time requirement
        if (s AT TIME ZONE teacher_timezone) < min_booking_time then
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
          return next;
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
        
        -- Generate slots manually with proper end time calculation
        s := series_start;
        while s + make_interval(mins => step) <= series_end loop
          slot_end_time := s + make_interval(mins => step);
          
          -- Check if slot meets minimum advance time requirement
          if (s AT TIME ZONE teacher_timezone) < min_booking_time then
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
            return next;
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

-- 9. Habilitar realtime para appointments
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ===================================================
-- VERIFICAÇÃO
-- ===================================================
SELECT 
  'teacher_schedule_exceptions' as table_name,
  COUNT(*) as row_count
FROM public.teacher_schedule_exceptions
UNION ALL
SELECT 
  'appointments' as table_name,
  COUNT(*) as row_count
FROM public.appointments;

-- Verificar se a função foi criada
SELECT 
  'list_available_slots_improved' as function_name,
  CASE WHEN pg_catalog.pg_proc.proname IS NOT NULL THEN 'CREATED' ELSE 'NOT FOUND' END as status
FROM pg_catalog.pg_proc
WHERE proname = 'list_available_slots_improved'
LIMIT 1;

-- ===================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- 2. Cole este script e execute
-- 3. Atualize a página do dashboard (F5)
-- ===================================================
