-- Remover triggers e funções antigas
DROP TRIGGER IF EXISTS ensure_teacher_tenant ON profiles CASCADE;
DROP TRIGGER IF EXISTS auto_assign_student_tenant ON profiles CASCADE;
DROP TRIGGER IF EXISTS validate_student_tenant_on_student_insert ON students CASCADE;
DROP FUNCTION IF EXISTS auto_create_tenant_for_teacher() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_student_tenant() CASCADE;
DROP FUNCTION IF EXISTS validate_student_tenant() CASCADE;

-- Corrigir FK
ALTER TABLE payment_audit_log DROP CONSTRAINT IF EXISTS payment_audit_log_user_id_fkey;
ALTER TABLE payment_audit_log ADD CONSTRAINT payment_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Limpar dados corrompidos
DO $$ 
DECLARE 
  v_corrupted UUID[];
  v_table_name TEXT;
  v_slug TEXT;
BEGIN
  -- Identificar tenants corrompidos
  SELECT ARRAY_AGG(DISTINCT t.id) INTO v_corrupted
  FROM tenants t JOIN profiles p ON p.tenant_id = t.id
  WHERE p.user_type = 'student';
  
  -- Limpar tenant_id de todas as tabelas
  FOR v_table_name IN 
    SELECT table_name 
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id'
    AND table_name NOT IN ('tenants', 'tenant_branding')
  LOOP
    EXECUTE format('UPDATE %I SET tenant_id = NULL WHERE tenant_id = ANY($1)', v_table_name) USING v_corrupted;
  END LOOP;
  
  -- Deletar tenant_branding e tenants
  DELETE FROM tenant_branding WHERE tenant_id = ANY(v_corrupted);
  DELETE FROM tenants WHERE id = ANY(v_corrupted);
  
  -- Criar tenants para professores (com slug)
  INSERT INTO tenants (name, slug, created_at, updated_at)
  SELECT 
    COALESCE(p.name, p.email, 'Professor') || ' - Academia',
    lower(regexp_replace(COALESCE(p.name, p.email, 'professor'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    NOW(), NOW()
  FROM profiles p
  WHERE p.user_type = 'teacher'
  AND (p.tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = p.tenant_id));
  
  -- Atribuir tenant_id aos professores
  UPDATE profiles p SET tenant_id = (
    SELECT t.id FROM tenants t
    WHERE t.name ILIKE '%' || COALESCE(p.name, p.email, 'Professor') || '%'
    ORDER BY t.created_at DESC LIMIT 1
  ) WHERE p.user_type = 'teacher' AND p.tenant_id IS NULL;
  
  -- Criar tenant_branding
  INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color)
  SELECT DISTINCT p.tenant_id, 'hsl(142.1 76.2% 36.3%)', 'hsl(142.1 70.6% 45.3%)'
  FROM profiles p WHERE p.user_type = 'teacher' AND p.tenant_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  
  -- Corrigir tenant_id de estudantes
  UPDATE profiles p SET tenant_id = t.tenant_id
  FROM students s JOIN profiles t ON t.id = s.teacher_id
  WHERE p.id = s.user_id AND p.user_type = 'student' AND t.tenant_id IS NOT NULL;
  
  UPDATE students s SET tenant_id = t.tenant_id
  FROM profiles t WHERE s.teacher_id = t.id AND t.tenant_id IS NOT NULL;
  
  -- Marcar perfis completos
  UPDATE profiles SET profile_complete = true
  WHERE user_type IS NOT NULL
  AND ((user_type = 'teacher' AND tenant_id IS NOT NULL) OR user_type = 'student')
  AND profile_complete = false;
END $$;

-- Funções e triggers
CREATE OR REPLACE FUNCTION auto_create_tenant_for_teacher()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid UUID; v_slug TEXT;
BEGIN
  IF NEW.user_type = 'teacher' AND NEW.tenant_id IS NULL THEN
    v_slug := lower(regexp_replace(COALESCE(NEW.name, NEW.email, 'professor'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6);
    INSERT INTO tenants (name, slug, created_at, updated_at)
    VALUES (COALESCE(NEW.name, NEW.email, 'Professor') || ' - Academia', v_slug, NOW(), NOW())
    RETURNING id INTO v_tid;
    NEW.tenant_id := v_tid;
    INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color)
    VALUES (v_tid, 'hsl(142.1 76.2% 36.3%)', 'hsl(142.1 70.6% 45.3%)')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER ensure_teacher_tenant BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_create_tenant_for_teacher();

CREATE OR REPLACE FUNCTION validate_student_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid UUID;
BEGIN
  IF NEW.teacher_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tid FROM profiles WHERE id = NEW.teacher_id AND user_type = 'teacher';
    IF v_tid IS NOT NULL THEN
      UPDATE profiles SET tenant_id = v_tid WHERE id = NEW.user_id;
      NEW.tenant_id := v_tid;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER validate_student_tenant_on_student_insert AFTER INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION validate_student_tenant();

CREATE OR REPLACE FUNCTION safe_delete_user(user_id_to_delete UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;
  DELETE FROM payment_audit_log WHERE user_id = user_id_to_delete;
  DELETE FROM audit_log WHERE user_id = user_id_to_delete;
  RETURN jsonb_build_object('success', true, 'message', 'Pronto para exclusão');
END; $$;