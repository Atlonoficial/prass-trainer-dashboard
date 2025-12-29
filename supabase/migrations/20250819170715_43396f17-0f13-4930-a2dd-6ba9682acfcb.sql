-- Remove the problematic view completely since it's causing security issues
-- Instead, we'll rely on proper RLS policies on the appointments table
DROP VIEW IF EXISTS active_appointments;

-- Ensure RLS is properly enabled for appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create a more efficient index for 3-month queries specifically
CREATE INDEX IF NOT EXISTS idx_appointments_three_months 
ON public.appointments(teacher_id, scheduled_time) 
WHERE scheduled_time >= (now() - interval '3 months');

-- The remaining warnings (OTP expiry and password protection) are auth configuration
-- issues that need to be addressed in the Supabase dashboard, not via SQL migrations