-- ==========================================
-- FASE 1: UNIFICAR FUNÇÃO book_appointment
-- ==========================================

-- Remover versão antiga do book_appointment 
DROP FUNCTION IF EXISTS public.book_appointment(uuid, timestamp with time zone, text, integer, text, text, text, text, text);

-- Criar versão única e definitiva com todos parâmetros
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_teacher_id uuid,
  p_scheduled_time timestamp with time zone,
  p_type text DEFAULT 'class',
  p_duration integer DEFAULT 60,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_student_title text DEFAULT NULL,
  p_student_objectives text DEFAULT NULL,
  p_student_notes text DEFAULT NULL,
  p_is_manual_creation boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
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
  appointment_status text;
  is_teacher_creating boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE exception 'Not authenticated';
  END IF;

  -- Verificar se é o próprio professor criando (agendamento manual)
  IF uid = p_teacher_id OR p_is_manual_creation = true THEN
    is_teacher_creating := true;
  ELSE
    -- Verificar se é estudante autorizado
    IF NOT EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.user_id = uid AND st.teacher_id = p_teacher_id
    ) THEN
      RAISE exception 'Not authorized to book with this teacher';
    END IF;
  END IF;

  -- Get current time in Brazil timezone
  current_time_br := now() AT TIME ZONE teacher_timezone;

  -- Get booking settings
  SELECT * INTO booking_settings
  FROM public.teacher_booking_settings
  WHERE teacher_booking_settings.teacher_id = p_teacher_id;

  -- Set defaults if no settings found
  IF NOT FOUND THEN
    booking_settings.minimum_advance_minutes := 5;
    booking_settings.visibility_days := 30;
    booking_settings.allow_same_day := true;
    booking_settings.auto_confirm := false;
  END IF;

  -- Determinar status baseado na origem do agendamento
  IF is_teacher_creating THEN
    -- Agendamentos manuais pelo professor sempre confirmados
    appointment_status := 'confirmed';
  ELSE
    -- Agendamentos do aluno seguem a configuração auto_confirm
    IF booking_settings.auto_confirm = true THEN
      appointment_status := 'confirmed';
    ELSE
      appointment_status := 'scheduled'; -- Pendente confirmação manual
    END IF;
  END IF;

  -- Validações de tempo apenas para agendamentos de alunos
  IF NOT is_teacher_creating THEN
    -- Check minimum advance time requirement
    IF (p_scheduled_time AT TIME ZONE teacher_timezone) < (current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes)) THEN
      RAISE exception 'Booking time is too close to current time. Minimum advance: % minutes', booking_settings.minimum_advance_minutes;
    END IF;

    -- Check same day booking restriction
    IF the_date = current_time_br::date AND NOT booking_settings.allow_same_day THEN
      RAISE exception 'Same day booking is not allowed';
    END IF;

    -- Use improved slot validation for student bookings
    FOR slot IN
      SELECT * FROM public.list_available_slots_improved(p_teacher_id, the_date, the_date, step)
    LOOP
      IF slot.slot_start = p_scheduled_time AND slot.slot_end = slot_end THEN
        slot_ok := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT slot_ok THEN
      RAISE exception 'Selected time is not available';
    END IF;
  END IF;

  -- ATOMIC CHECK: Verify no conflicting appointment exists (race condition protection)
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.teacher_id = p_teacher_id
      AND a.status NOT IN ('cancelled')
      AND tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
          tstzrange(p_scheduled_time, slot_end, '[)')
  ) THEN
    RAISE exception 'Selected time slot is no longer available';
  END IF;

  -- Insert appointment with correct status
  INSERT INTO public.appointments (
    id, teacher_id, student_id, scheduled_time, duration, status, type, title, description,
    student_title, student_objectives, student_notes
  ) VALUES (
    extensions.uuid_generate_v4(), 
    p_teacher_id, 
    CASE WHEN is_teacher_creating THEN coalesce(uid, p_teacher_id) ELSE uid END,
    p_scheduled_time, 
    step, 
    appointment_status, 
    p_type,
    coalesce(p_title, CASE WHEN p_type = 'assessment' THEN 'Avaliação' ELSE 'Aula' END),
    p_description, 
    p_student_title, 
    p_student_objectives, 
    p_student_notes
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;