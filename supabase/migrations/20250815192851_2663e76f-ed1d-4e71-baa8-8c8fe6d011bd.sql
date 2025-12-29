-- Adicionar campos para informações enviadas pelo aluno
ALTER TABLE public.appointments 
ADD COLUMN student_title TEXT,
ADD COLUMN student_objectives TEXT,
ADD COLUMN student_notes TEXT;

-- Atualizar a função book_appointment para aceitar os novos campos
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_teacher_id uuid, 
  p_scheduled_time timestamp with time zone, 
  p_type text DEFAULT 'class'::text, 
  p_duration integer DEFAULT NULL::integer, 
  p_title text DEFAULT NULL::text, 
  p_description text DEFAULT NULL::text,
  p_student_title text DEFAULT NULL::text,
  p_student_objectives text DEFAULT NULL::text,
  p_student_notes text DEFAULT NULL::text
)
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
  the_date date := (p_scheduled_time at time zone 'UTC')::date;
  slot record;
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

  -- Ensure requested time matches one of the available slots
  for slot in
    select * from public.list_available_slots(p_teacher_id, the_date, step)
  loop
    if slot.slot_start = p_scheduled_time and slot.slot_end = slot_end then
      slot_ok := true;
      exit;
    end if;
  end loop;

  if not slot_ok then
    raise exception 'Selected time is not available';
  end if;

  -- Insert appointment. SECURITY DEFINER ensures it bypasses teacher-only insert policy.
  insert into public.appointments (
    id, teacher_id, student_id, scheduled_time, duration, status, type, title, description,
    student_title, student_objectives, student_notes
  ) values (
    extensions.uuid_generate_v4(), p_teacher_id, uid, p_scheduled_time, step, 'scheduled', p_type,
    coalesce(p_title, case when p_type = 'assessment' then 'Avaliação' else 'Aula' end),
    p_description, p_student_title, p_student_objectives, p_student_notes
  ) returning id into new_id;

  return new_id;
end;
$function$