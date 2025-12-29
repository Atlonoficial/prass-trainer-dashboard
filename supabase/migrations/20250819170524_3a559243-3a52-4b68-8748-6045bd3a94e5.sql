-- Fix security issues from the linter

-- 1. Fix the view to not use SECURITY DEFINER (ERROR 1)
DROP VIEW IF EXISTS active_appointments;
CREATE VIEW active_appointments AS
SELECT *
FROM public.appointments
WHERE scheduled_time >= (now() - interval '3 months')
ORDER BY scheduled_time DESC;

-- 2. Fix function search_path issues (WARN 2 & 3)
CREATE OR REPLACE FUNCTION clean_old_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION validate_appointment_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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