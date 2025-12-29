-- SECURITY FIXES - TARGETED APPROACH
-- Fix search_path configuration for critical security functions

-- 1. Fix log_sensitive_access function (already has search_path, ensuring it's correct)
CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, record_id uuid, access_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 2. Fix update_session_activity function  
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions 
  SET last_activity = now()
  WHERE session_token = p_session_token AND is_active = true;
END;
$$;

-- 3. Fix cleanup_rate_limit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_log 
  WHERE created_at < (NOW() - INTERVAL '24 hours');
END;
$$;

-- 4. Fix cleanup_old_chat_messages function
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete messages older than 3 months
  DELETE FROM chat_messages 
  WHERE created_at < (now() - interval '3 months');
  
  -- Log cleanup activity
  RAISE NOTICE 'Cleaned chat messages older than 3 months';
END;
$$;