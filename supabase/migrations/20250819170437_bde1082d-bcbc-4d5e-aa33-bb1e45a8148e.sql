-- Create function to clean old appointments (older than 6 months)
CREATE OR REPLACE FUNCTION clean_old_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive appointments older than 6 months
  -- This ensures we keep 3 months of active history plus 3 months buffer
  DELETE FROM public.appointments 
  WHERE scheduled_time < (now() - interval '6 months')
    AND status IN ('cancelled', 'completed');
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned old appointments older than 6 months';
END;
$$;

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_time_teacher 
ON public.appointments(teacher_id, scheduled_time DESC);

-- Create index for student appointments queries  
CREATE INDEX IF NOT EXISTS idx_appointments_student_time
ON public.appointments(student_id, scheduled_time DESC);

-- Create index for status-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_status_time
ON public.appointments(status, scheduled_time DESC) 
WHERE status IS NOT NULL;

-- Add constraint to prevent scheduling in the past (more than 1 hour ago)
-- Using a validation function instead of CHECK constraint for flexibility
CREATE OR REPLACE FUNCTION validate_appointment_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

-- Create trigger for appointment time validation
DROP TRIGGER IF EXISTS trigger_validate_appointment_time ON public.appointments;
CREATE TRIGGER trigger_validate_appointment_time
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_time();

-- Add a helpful view for active appointments (within 3 months)
CREATE OR REPLACE VIEW active_appointments AS
SELECT *
FROM public.appointments
WHERE scheduled_time >= (now() - interval '3 months')
ORDER BY scheduled_time DESC;