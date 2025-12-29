-- ============================================
-- MIGRATION: Garantir sincronização completa de roles
-- ============================================

-- 1. Verificar e corrigir roles existentes
DO $$
DECLARE
  profile_record RECORD;
  role_count INTEGER := 0;
BEGIN
  -- Inserir roles para TODOS os profiles que ainda não têm
  FOR profile_record IN 
    SELECT p.id, p.user_type
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.user_type IS NOT NULL 
      AND p.user_type IN ('teacher', 'admin', 'student')
      AND ur.id IS NULL
  LOOP
    INSERT INTO user_roles (user_id, role)
    VALUES (profile_record.id, profile_record.user_type::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    role_count := role_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Sincronização completa! % roles criados/atualizados', role_count;
END $$;

-- 2. Verificar usuário atual (para debug)
DO $$
DECLARE
  current_user_role TEXT;
  user_in_roles BOOLEAN;
BEGIN
  -- Buscar user_type do profile
  SELECT user_type INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Verificar se existe em user_roles
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = auth.uid()
  ) INTO user_in_roles;
  
  IF current_user_role IS NOT NULL THEN
    RAISE NOTICE '👤 Usuário atual: ID=%, tipo=%, em user_roles=%', auth.uid(), current_user_role, user_in_roles;
  END IF;
END $$;

-- 3. Log estatísticas finais
DO $$
DECLARE
  total_profiles INTEGER;
  total_roles INTEGER;
  teachers INTEGER;
  students INTEGER;
  admins INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles WHERE user_type IS NOT NULL;
  SELECT COUNT(*) INTO total_roles FROM user_roles;
  SELECT COUNT(*) INTO teachers FROM user_roles WHERE role = 'teacher';
  SELECT COUNT(*) INTO students FROM user_roles WHERE role = 'student';
  SELECT COUNT(*) INTO admins FROM user_roles WHERE role = 'admin';
  
  RAISE NOTICE '📊 Estatísticas:';
  RAISE NOTICE '  Profiles com tipo: %', total_profiles;
  RAISE NOTICE '  Roles criados: %', total_roles;
  RAISE NOTICE '  Teachers: %, Students: %, Admins: %', teachers, students, admins;
END $$;