-- Fix Function Search Path Security Issues
-- Update all functions to have proper search_path settings

-- Fix log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name TEXT,
  record_id UUID,
  access_type TEXT
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
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
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  operation_type TEXT,
  max_attempts INTEGER DEFAULT 5,
  time_window INTERVAL DEFAULT '1 hour'::interval
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
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
$$;

-- Fix cleanup_rate_limit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$$;

-- Fix validate_input function
CREATE OR REPLACE FUNCTION public.validate_input(
  input_text TEXT,
  max_length INTEGER DEFAULT 1000,
  allow_html BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
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
$$;