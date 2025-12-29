-- ===================================================
-- SCRIPT CONSOLIDADO PARA CONFIGURAR O DASHBOARD
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- ============================================================
-- PARTE 1: TABELA teacher_availability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id ON public.teacher_availability(teacher_id);
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can insert own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can update own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can delete own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Students can view teacher availability" ON public.teacher_availability;

CREATE POLICY "Teachers can view own availability" ON public.teacher_availability FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can insert own availability" ON public.teacher_availability FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own availability" ON public.teacher_availability FOR UPDATE USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own availability" ON public.teacher_availability FOR DELETE USING (teacher_id = auth.uid());
CREATE POLICY "Students can view teacher availability" ON public.teacher_availability FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.teacher_id = teacher_availability.teacher_id AND s.user_id = auth.uid())
);

-- ============================================================
-- PARTE 2: TABELA teacher_booking_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  minimum_advance_minutes INTEGER NOT NULL DEFAULT 120,
  visibility_days INTEGER NOT NULL DEFAULT 7,
  allow_same_day BOOLEAN NOT NULL DEFAULT false,
  auto_confirm BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_booking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own booking settings" ON public.teacher_booking_settings;
DROP POLICY IF EXISTS "Students can view teacher booking settings" ON public.teacher_booking_settings;

CREATE POLICY "Teachers can manage own booking settings" ON public.teacher_booking_settings FOR ALL USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Students can view teacher booking settings" ON public.teacher_booking_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.teacher_id = teacher_booking_settings.teacher_id AND s.user_id = auth.uid())
);

-- ============================================================
-- PARTE 3: TABELA nutrition_formulas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_formulas_created_by ON public.nutrition_formulas(created_by);
ALTER TABLE public.nutrition_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can create own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can update own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can delete own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Teachers can view students formulas" ON public.nutrition_formulas;

CREATE POLICY "Users can view own formulas" ON public.nutrition_formulas FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create own formulas" ON public.nutrition_formulas FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own formulas" ON public.nutrition_formulas FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete own formulas" ON public.nutrition_formulas FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Teachers can view students formulas" ON public.nutrition_formulas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = nutrition_formulas.created_by AND s.teacher_id = auth.uid())
);

-- ============================================================
-- PARTE 4: TABELA training_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.training_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gym' CHECK (type IN ('gym', 'studio', 'outdoor', 'online', 'home')),
  address TEXT,
  description TEXT,
  google_maps_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_locations_teacher_id ON public.training_locations(teacher_id);
ALTER TABLE public.training_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can create training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can update own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can delete own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Students can view active training locations" ON public.training_locations;

CREATE POLICY "Teachers can view own training locations" ON public.training_locations FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can create training locations" ON public.training_locations FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own training locations" ON public.training_locations FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own training locations" ON public.training_locations FOR DELETE USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view active training locations" ON public.training_locations FOR SELECT USING (
  is_active = true AND EXISTS (SELECT 1 FROM public.students s WHERE s.teacher_id = training_locations.teacher_id AND s.user_id = auth.uid())
);

-- ============================================================
-- PARTE 5: TABELA teacher_schedule_exceptions
-- ============================================================
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

ALTER TABLE public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own schedule exceptions" ON public.teacher_schedule_exceptions;
DROP POLICY IF EXISTS "Students can view teacher schedule exceptions" ON public.teacher_schedule_exceptions;

CREATE POLICY "Teachers can manage own schedule exceptions" ON public.teacher_schedule_exceptions FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Students can view teacher schedule exceptions" ON public.teacher_schedule_exceptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.teacher_id = teacher_schedule_exceptions.teacher_id AND s.user_id = auth.uid())
);

-- ============================================================
-- PARTE 6: TABELA appointments
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_appointments_teacher_id ON public.appointments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON public.appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_time ON public.appointments(scheduled_time);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Students can view own appointments" ON public.appointments;

CREATE POLICY "Teachers can manage own appointments" ON public.appointments FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Students can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = student_id);

-- ============================================================
-- PARTE 7: FUNÇÃO update_updated_at_column
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTE 8: FUNÇÃO list_available_slots_improved
-- ============================================================
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
  if uid is not null and uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to view this teacher''s availability';
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
  end if;

  min_booking_time := current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes);
  max_booking_date := current_time_br::date + make_interval(days => booking_settings.visibility_days);

  if p_end_date > max_booking_date then
    p_end_date := max_booking_date;
  end if;

  iter_date := p_start_date;
  
  while iter_date <= p_end_date loop
    wday := extract(dow from iter_date);
    is_exception := false;
    has_special_hours := false;
    
    if iter_date = current_time_br::date and not booking_settings.allow_same_day then
      iter_date := iter_date + 1;
      continue;
    end if;
    
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
    
    if has_special_hours then
      step := coalesce(p_slot_minutes, 60);
      series_start := (iter_date + exception.special_start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      series_end := (iter_date + exception.special_end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      
      s := series_start;
      while s + make_interval(mins => step) <= series_end loop
        slot_end_time := s + make_interval(mins => step);
        
        if (s AT TIME ZONE teacher_timezone) < min_booking_time then
          s := s + make_interval(mins => step);
          continue;
        end if;
        
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
      for av in
        select *
        from public.teacher_availability ta
        where ta.teacher_id = p_teacher_id and ta.weekday = wday
      loop
        step := coalesce(p_slot_minutes, av.slot_minutes, 60);
        series_start := (iter_date + av.start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        series_end := (iter_date + av.end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        
        s := series_start;
        while s + make_interval(mins => step) <= series_end loop
          slot_end_time := s + make_interval(mins => step);
          
          if (s AT TIME ZONE teacher_timezone) < min_booking_time then
            s := s + make_interval(mins => step);
            continue;
          end if;
          
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

-- ============================================================
-- PARTE 9: HABILITAR REALTIME
-- ============================================================
ALTER TABLE public.teacher_availability REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.training_locations REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_availability;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.training_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'teacher_availability' as tabela, COUNT(*) as registros FROM public.teacher_availability
UNION ALL SELECT 'teacher_booking_settings', COUNT(*) FROM public.teacher_booking_settings
UNION ALL SELECT 'nutrition_formulas', COUNT(*) FROM public.nutrition_formulas
UNION ALL SELECT 'training_locations', COUNT(*) FROM public.training_locations
UNION ALL SELECT 'teacher_schedule_exceptions', COUNT(*) FROM public.teacher_schedule_exceptions
UNION ALL SELECT 'appointments', COUNT(*) FROM public.appointments;

-- ===================================================
-- FIM DO SCRIPT
-- Atualize a página do dashboard após executar (F5)
-- ===================================================
