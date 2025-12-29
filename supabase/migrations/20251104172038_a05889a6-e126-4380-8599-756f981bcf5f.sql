-- ============================================
-- MIGRATION: Popular user_roles com dados existentes
-- ============================================

-- Inserir roles baseados em profiles.user_type
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'teacher'::app_role
FROM public.profiles p
WHERE p.user_type = 'teacher'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'admin'::app_role
FROM public.profiles p
WHERE p.user_type = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'student'::app_role
FROM public.profiles p
WHERE p.user_type = 'student'
ON CONFLICT (user_id, role) DO NOTHING;

-- Log resultado
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  RAISE NOTICE '✅ Roles populados! Total de registros: %', role_count;
END $$;