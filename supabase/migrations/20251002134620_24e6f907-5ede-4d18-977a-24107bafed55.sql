-- =====================================================
-- RESTAURAR TRIGGERS CRÍTICOS DE MULTI-TENANT
-- =====================================================

-- 1. Função: Criar tenant automaticamente para professores
CREATE OR REPLACE FUNCTION public.auto_create_tenant_for_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tid UUID; 
  v_slug TEXT;
BEGIN
  -- Se é professor e não tem tenant_id
  IF NEW.user_type = 'teacher' AND NEW.tenant_id IS NULL THEN
    -- Gerar slug único
    v_slug := lower(regexp_replace(COALESCE(NEW.name, NEW.email, 'professor'), '[^a-zA-Z0-9]+', '-', 'g')) 
              || '-' || substr(md5(random()::text), 1, 6);
    
    -- Criar tenant
    INSERT INTO tenants (name, slug, created_at, updated_at)
    VALUES (
      COALESCE(NEW.name, NEW.email, 'Professor') || ' - Academia', 
      v_slug, 
      NOW(), 
      NOW()
    )
    RETURNING id INTO v_tid;
    
    -- Atribuir tenant ao professor
    NEW.tenant_id := v_tid;
    
    -- Criar branding padrão
    INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color)
    VALUES (v_tid, 'hsl(142.1 76.2% 36.3%)', 'hsl(142.1 70.6% 45.3%)')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '[TENANT] Tenant criado automaticamente: % para professor: %', v_tid, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Função: Validar e herdar tenant do professor para aluno
CREATE OR REPLACE FUNCTION public.validate_student_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tid UUID;
BEGIN
  -- Se tem teacher_id, buscar tenant do professor
  IF NEW.teacher_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tid 
    FROM profiles 
    WHERE id = NEW.teacher_id AND user_type = 'teacher';
    
    IF v_tid IS NOT NULL THEN
      -- Atualizar tenant do aluno no profiles
      UPDATE profiles 
      SET tenant_id = v_tid 
      WHERE id = NEW.user_id;
      
      -- Atribuir tenant no students
      NEW.tenant_id := v_tid;
      
      RAISE NOTICE '[TENANT] Aluno % herdou tenant % do professor %', NEW.user_id, v_tid, NEW.teacher_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Recriar trigger para professores (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS ensure_teacher_tenant ON public.profiles;
CREATE TRIGGER ensure_teacher_tenant
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_tenant_for_teacher();

-- 4. Recriar trigger para alunos (BEFORE INSERT/UPDATE)
DROP TRIGGER IF EXISTS validate_student_tenant_on_student_insert ON public.students;
CREATE TRIGGER validate_student_tenant_on_student_insert
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_student_tenant();

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers de multi-tenant restaurados com sucesso!';
  RAISE NOTICE '✅ auto_create_tenant_for_teacher() - ON profiles';
  RAISE NOTICE '✅ validate_student_tenant() - ON students';
END $$;