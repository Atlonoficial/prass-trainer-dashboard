-- Create table for user MFA settings
CREATE TABLE public.user_mfa_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  phone_number text,
  backup_codes text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table for security activity log
CREATE TABLE public.security_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_description text NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}',
  location_info jsonb DEFAULT '{}',
  success boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for active sessions tracking
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  device_info jsonb DEFAULT '{}',
  ip_address text,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone
);

-- Enable RLS on all security tables
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_mfa_settings
CREATE POLICY "Users can view own MFA settings" 
ON public.user_mfa_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings" 
ON public.user_mfa_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for security_activity_log
CREATE POLICY "Users can view own security activity" 
ON public.security_activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" 
ON public.security_activity_log 
FOR INSERT 
WITH CHECK (true);

-- Create policies for user_sessions
CREATE POLICY "Users can view own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" 
ON public.user_sessions 
FOR ALL 
WITH CHECK (true);

-- Create function to log security activities
CREATE OR REPLACE FUNCTION public.log_security_activity(
  p_user_id uuid,
  p_activity_type text,
  p_activity_description text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_info jsonb DEFAULT '{}',
  p_success boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_activity_log (
    user_id,
    activity_type,
    activity_description,
    ip_address,
    user_agent,
    device_info,
    success
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_activity_description,
    p_ip_address,
    p_user_agent,
    p_device_info,
    p_success
  );
END;
$$;

-- Create function to generate backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes()
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  codes text[] := '{}';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    codes := array_append(codes, upper(encode(gen_random_bytes(4), 'hex')));
  END LOOP;
  RETURN codes;
END;
$$;

-- Create function to update session activity
CREATE OR REPLACE FUNCTION public.update_session_activity(p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET last_activity = now()
  WHERE session_token = p_session_token AND is_active = true;
END;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_mfa_settings_updated_at
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();