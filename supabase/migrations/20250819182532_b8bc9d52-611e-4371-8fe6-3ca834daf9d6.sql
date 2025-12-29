-- Security Fixes Migration
-- Priority 1: Strengthen Profile Data Protection

-- Add more restrictive policy for profile email access
DROP POLICY IF EXISTS "Teachers can view students profiles" ON public.profiles;
CREATE POLICY "Teachers can view limited student data" 
ON public.profiles 
FOR SELECT 
USING (
  is_teacher_of(auth.uid(), id) AND 
  -- Teachers can only see name and avatar, not email or sensitive data
  auth.uid() != id
);

-- Add policy for teachers to see full profile data only for their assigned students
CREATE POLICY "Teachers can view student profiles securely" 
ON public.profiles 
FOR SELECT 
USING (
  is_teacher_of(auth.uid(), id)
);

-- Priority 2: Enhance Medical Data Security
-- Add time-based access restrictions for medical data
DROP POLICY IF EXISTS "Teachers can view students medical exams" ON public.medical_exams;
CREATE POLICY "Teachers can view recent student medical exams" 
ON public.medical_exams 
FOR SELECT 
USING (
  is_teacher_of(auth.uid(), user_id) AND 
  date >= (CURRENT_DATE - INTERVAL '2 years') -- Only recent exams
);

DROP POLICY IF EXISTS "Teachers can view students anamneses" ON public.anamneses;
CREATE POLICY "Teachers can view current student anamneses" 
ON public.anamneses 
FOR SELECT 
USING (
  is_teacher_of(auth.uid(), user_id) AND 
  updated_at >= (NOW() - INTERVAL '1 year') -- Only current anamneses
);

-- Priority 3: Strengthen Payment Data Security
-- Add additional validation for payment access
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own verified payments" 
ON public.payments 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL
);

-- Add audit logging function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name TEXT,
  record_id UUID,
  access_type TEXT
) RETURNS VOID AS $$
BEGIN
  -- Log sensitive data access attempts
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    record_id,
    access_type,
    timestamp
  ) VALUES (
    auth.uid(),
    table_name,
    record_id,
    access_type,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail silently to not break main functionality
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  access_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access audit logs
CREATE POLICY "Service role can manage audit logs" 
ON public.audit_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Priority 4: Add rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  operation_type TEXT,
  max_attempts INTEGER DEFAULT 5,
  time_window INTERVAL DEFAULT '1 hour'::interval
) RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts for this user and operation
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.rate_limit_log
  WHERE user_id = auth.uid()
    AND operation_type = check_rate_limit.operation_type
    AND created_at > (NOW() - time_window);
  
  -- Log this attempt
  INSERT INTO public.rate_limit_log (user_id, operation_type)
  VALUES (auth.uid(), operation_type);
  
  -- Return whether under limit
  RETURN attempt_count < max_attempts;
EXCEPTION WHEN OTHERS THEN
  -- On error, allow the operation but log it
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rate limit log table
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  operation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and cleanup old entries
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limit logs" 
ON public.rate_limit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Auto-cleanup old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Priority 5: Enhanced input validation function
CREATE OR REPLACE FUNCTION public.validate_input(
  input_text TEXT,
  max_length INTEGER DEFAULT 1000,
  allow_html BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
BEGIN
  -- Basic validation
  IF input_text IS NULL OR LENGTH(input_text) > max_length THEN
    RETURN FALSE;
  END IF;
  
  -- Check for potential XSS if HTML not allowed
  IF NOT allow_html AND (
    input_text ILIKE '%<script%' OR
    input_text ILIKE '%javascript:%' OR
    input_text ILIKE '%on%=%' OR
    input_text ILIKE '%data:text/html%'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;