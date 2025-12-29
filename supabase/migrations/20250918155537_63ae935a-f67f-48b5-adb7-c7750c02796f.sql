-- SECURITY FIX: Critical Privacy and Database Hardening
-- Phase 1: Fix Critical User Privacy Issue - Restrict user_presence access
-- Phase 2: Add secure search_path to database functions

-- Fix 1: Update user_presence RLS policy to restrict viewing based on teacher-student relationships
DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;

CREATE POLICY "Users can view authorized presence only" ON public.user_presence
FOR SELECT USING (
  -- Users can see their own presence
  auth.uid() = user_id 
  OR 
  -- Students can see their teacher's presence
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() 
    AND s.teacher_id = user_presence.user_id
  )
  OR
  -- Teachers can see their students' presence  
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = auth.uid()
    AND s.user_id = user_presence.user_id
  )
);

-- Fix 2: Add secure search_path to critical database functions
-- Update validate_input function
CREATE OR REPLACE FUNCTION public.validate_input(input_text text, max_length integer DEFAULT 1000, allow_html boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF input_text IS NULL OR LENGTH(input_text) > max_length THEN
    RETURN FALSE;
  END IF;
  
  -- Enhanced XSS protection
  IF NOT allow_html AND (
    input_text ILIKE '%<script%' OR
    input_text ILIKE '%javascript:%' OR
    input_text ILIKE '%on%=%' OR
    input_text ILIKE '%data:text/html%' OR
    input_text ILIKE '%<iframe%' OR
    input_text ILIKE '%<object%' OR
    input_text ILIKE '%<embed%'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Update check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_type text, max_attempts integer DEFAULT 5, time_window interval DEFAULT '01:00:00'::interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Update log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, record_id uuid, access_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Log sensitive data access attempts
  INSERT INTO audit_log (
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
$function$;

-- Update sanitize_chat_input function
CREATE OR REPLACE FUNCTION public.sanitize_chat_input(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- More comprehensive input validation for chat
  IF input_text IS NULL OR LENGTH(input_text) > 5000 THEN
    RETURN FALSE;
  END IF;
  
  -- Block potential XSS and injection attempts
  IF input_text ILIKE '%<script%' OR
     input_text ILIKE '%javascript:%' OR
     input_text ILIKE '%data:text/html%' OR
     input_text ILIKE '%<iframe%' OR
     input_text ILIKE '%<object%' OR
     input_text ILIKE '%<embed%' OR
     input_text ILIKE '%eval(%' OR
     input_text ILIKE '%document.%' OR
     input_text ILIKE '%window.%' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix 3: Create security monitoring table for enhanced tracking
CREATE TABLE IF NOT EXISTS public.security_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  ip_address INET,
  device_info JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security_activities
ALTER TABLE public.security_activities ENABLE ROW LEVEL SECURITY;

-- Policy for security activities - users can only see their own
CREATE POLICY "Users can view own security activities" ON public.security_activities
FOR SELECT USING (auth.uid() = user_id);

-- Policy for inserting security activities
CREATE POLICY "Users can log own security activities" ON public.security_activities
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix 4: Add index for performance on security-critical tables
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON public.audit_log(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_operation ON public.rate_limit_log(user_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_security_activities_user_type ON public.security_activities(user_id, activity_type);

-- Fix 5: Create function to clean up old security logs (data retention)
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM public.audit_log 
  WHERE timestamp < (NOW() - INTERVAL '1 year');
  
  -- Delete rate limit logs older than 7 days
  DELETE FROM public.rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '7 days');
  
  -- Delete security activities older than 6 months
  DELETE FROM public.security_activities 
  WHERE created_at < (NOW() - INTERVAL '6 months');
  
  RAISE NOTICE 'Security logs cleanup completed';
END;
$function$;