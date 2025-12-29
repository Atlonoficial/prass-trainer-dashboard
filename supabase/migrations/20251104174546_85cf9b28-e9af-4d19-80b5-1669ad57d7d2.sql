-- TEMPORARY: Ultra permissive RLS policy for system_payment_config
-- This allows ANY authenticated user to manage payment configuration
-- TODO: After initial setup works, restrict this to admin/teacher roles only

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can view payment config" ON system_payment_config;
DROP POLICY IF EXISTS "Only admins can insert payment config" ON system_payment_config;
DROP POLICY IF EXISTS "Only admins can update payment config" ON system_payment_config;
DROP POLICY IF EXISTS "Teachers and admins can view payment config" ON system_payment_config;
DROP POLICY IF EXISTS "Teachers and admins can manage payment config" ON system_payment_config;

-- Create single ultra-permissive policy (TEMPORARY)
CREATE POLICY "temp_authenticated_users_full_access"
ON system_payment_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add helpful comment
COMMENT ON POLICY "temp_authenticated_users_full_access" ON system_payment_config IS 
'TEMPORARY POLICY: Allows all authenticated users to manage payment config. Should be restricted to admin/teacher roles after initial setup is working.';