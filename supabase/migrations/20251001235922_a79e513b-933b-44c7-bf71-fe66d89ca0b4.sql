-- ================================================================
-- FASE 1: Corrigir Sistema de Tenant para Teachers
-- ================================================================

-- 1.1: Dropar função com CASCADE para remover triggers dependentes
DROP FUNCTION IF EXISTS auto_create_tenant_for_teacher() CASCADE;

CREATE OR REPLACE FUNCTION auto_create_tenant_for_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tenant_id UUID;
  v_tenant_name TEXT;
BEGIN
  -- Só criar tenant se for teacher e não tiver tenant_id
  IF NEW.user_type = 'teacher' AND NEW.tenant_id IS NULL THEN
    
    -- Gerar nome do tenant
    v_tenant_name := COALESCE(
      NEW.name || ' Studio',
      split_part(NEW.email, '@', 1) || ' Studio'
    );
    
    RAISE NOTICE '[TENANT_CREATE] Creating tenant for teacher: %, email: %', NEW.id, NEW.email;
    
    -- Criar o tenant
    INSERT INTO tenants (name, status, created_by)
    VALUES (v_tenant_name, 'active', NEW.id)
    RETURNING id INTO v_tenant_id;
    
    -- Atualizar o profile com o tenant_id
    NEW.tenant_id := v_tenant_id;
    
    -- Criar branding padrão
    INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color)
    VALUES (v_tenant_id, '#FF6B35', '#004E89');
    
    RAISE NOTICE '[TENANT_CREATE] Tenant created successfully: % for teacher: %', v_tenant_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER auto_create_tenant_for_teacher_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_for_teacher();

-- ================================================================
-- FASE 2: Corrigir Auto-Assignment de Students
-- ================================================================

-- 2.1: Dropar trigger de auto-assignment incorreto
DROP TRIGGER IF EXISTS auto_assign_tenant_id_trigger ON students;

-- 2.2: Criar função para validar tenant_id em students
DROP FUNCTION IF EXISTS validate_student_tenant() CASCADE;

CREATE OR REPLACE FUNCTION validate_student_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_tenant_id UUID;
BEGIN
  -- Se já tem tenant_id, validar que é o mesmo do professor
  IF NEW.tenant_id IS NOT NULL AND NEW.teacher_id IS NOT NULL THEN
    SELECT tenant_id INTO v_teacher_tenant_id
    FROM profiles
    WHERE id = NEW.teacher_id AND user_type = 'teacher';
    
    IF v_teacher_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Teacher % does not have a tenant_id', NEW.teacher_id;
    END IF;
    
    IF NEW.tenant_id != v_teacher_tenant_id THEN
      RAISE EXCEPTION 'Student tenant_id must match teacher tenant_id';
    END IF;
  END IF;
  
  -- Se não tem tenant_id mas tem teacher_id, copiar do professor
  IF NEW.tenant_id IS NULL AND NEW.teacher_id IS NOT NULL THEN
    SELECT tenant_id INTO v_teacher_tenant_id
    FROM profiles
    WHERE id = NEW.teacher_id AND user_type = 'teacher';
    
    IF v_teacher_tenant_id IS NOT NULL THEN
      NEW.tenant_id := v_teacher_tenant_id;
      
      -- Atualizar também o profile do student
      UPDATE profiles
      SET tenant_id = v_teacher_tenant_id
      WHERE id = NEW.user_id;
      
      RAISE NOTICE '[STUDENT_TENANT] Assigned tenant % to student %', v_teacher_tenant_id, NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para validar tenant em students
CREATE TRIGGER validate_student_tenant_trigger
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_tenant();

-- ================================================================
-- FASE 3: Função de Limpeza de Dados Corrompidos
-- ================================================================

CREATE OR REPLACE FUNCTION fix_corrupted_multi_tenant_data()
RETURNS TABLE(
  fixed_profiles INTEGER,
  fixed_students INTEGER,
  created_tenants INTEGER,
  errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fixed_profiles INTEGER := 0;
  v_fixed_students INTEGER := 0;
  v_created_tenants INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_teacher RECORD;
  v_student RECORD;
  v_tenant_id UUID;
BEGIN
  RAISE NOTICE '[FIX_DATA] Starting data cleanup...';
  
  -- 1. Corrigir teachers sem tenant_id
  FOR v_teacher IN 
    SELECT id, email, name 
    FROM profiles 
    WHERE user_type = 'teacher' AND tenant_id IS NULL
  LOOP
    BEGIN
      -- Criar tenant para o teacher
      INSERT INTO tenants (name, status, created_by)
      VALUES (
        COALESCE(v_teacher.name || ' Studio', split_part(v_teacher.email, '@', 1) || ' Studio'),
        'active',
        v_teacher.id
      )
      RETURNING id INTO v_tenant_id;
      
      -- Atualizar profile do teacher
      UPDATE profiles
      SET tenant_id = v_tenant_id
      WHERE id = v_teacher.id;
      
      -- Criar branding padrão
      INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color)
      VALUES (v_tenant_id, '#FF6B35', '#004E89');
      
      v_fixed_profiles := v_fixed_profiles + 1;
      v_created_tenants := v_created_tenants + 1;
      
      RAISE NOTICE '[FIX_DATA] Fixed teacher % with tenant %', v_teacher.id, v_tenant_id;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Teacher ' || v_teacher.id || ': ' || SQLERRM);
      RAISE WARNING '[FIX_DATA] Error fixing teacher %: %', v_teacher.id, SQLERRM;
    END;
  END LOOP;
  
  -- 2. Corrigir students com teacher_id mas sem tenant_id
  FOR v_student IN
    SELECT s.id, s.user_id, s.teacher_id, p.tenant_id as teacher_tenant_id
    FROM students s
    JOIN profiles p ON p.id = s.teacher_id
    WHERE s.tenant_id IS NULL AND s.teacher_id IS NOT NULL
  LOOP
    BEGIN
      -- Atualizar student com tenant_id do professor
      UPDATE students
      SET tenant_id = v_student.teacher_tenant_id
      WHERE id = v_student.id;
      
      -- Atualizar profile do student também
      UPDATE profiles
      SET tenant_id = v_student.teacher_tenant_id
      WHERE id = v_student.user_id;
      
      v_fixed_students := v_fixed_students + 1;
      
      RAISE NOTICE '[FIX_DATA] Fixed student % with teacher tenant %', v_student.user_id, v_student.teacher_tenant_id;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Student ' || v_student.user_id || ': ' || SQLERRM);
      RAISE WARNING '[FIX_DATA] Error fixing student %: %', v_student.user_id, SQLERRM;
    END;
  END LOOP;
  
  -- 3. Marcar profiles incompletos como completos se já têm os dados necessários
  UPDATE profiles
  SET profile_complete = TRUE
  WHERE profile_complete = FALSE 
    AND user_type IS NOT NULL 
    AND tenant_id IS NOT NULL;
  
  RAISE NOTICE '[FIX_DATA] Cleanup completed. Profiles: %, Students: %, Tenants: %, Errors: %', 
    v_fixed_profiles, v_fixed_students, v_created_tenants, array_length(v_errors, 1);
  
  RETURN QUERY SELECT v_fixed_profiles, v_fixed_students, v_created_tenants, v_errors;
END;
$$;

-- ================================================================
-- FASE 4: Executar Limpeza Imediata dos Dados Corrompidos
-- ================================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM fix_corrupted_multi_tenant_data();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA CLEANUP RESULTS:';
  RAISE NOTICE 'Fixed Profiles: %', v_result.fixed_profiles;
  RAISE NOTICE 'Fixed Students: %', v_result.fixed_students;
  RAISE NOTICE 'Created Tenants: %', v_result.created_tenants;
  RAISE NOTICE 'Errors: %', COALESCE(array_length(v_result.errors, 1), 0);
  RAISE NOTICE '========================================';
END $$;