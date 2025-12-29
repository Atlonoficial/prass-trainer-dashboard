-- FASE 1: Corrigir alunos órfãos existentes
-- Associar alunos sem teacher_id ao admin único do sistema
UPDATE students
SET 
  teacher_id = '2db424b4-08d2-4ad0-9dd0-971eaab960e1',
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = '2db424b4-08d2-4ad0-9dd0-971eaab960e1'),
  updated_at = NOW()
WHERE teacher_id IS NULL
  AND user_id IN ('1efaa3d9-ec25-48bc-a0b2-02f4905a1932', '8fe61291-8975-43d5-b96f-ca8f97a8ac33');

-- FASE 3: Criar trigger para prevenir futuros alunos órfãos
CREATE OR REPLACE FUNCTION auto_assign_orphan_students()
RETURNS TRIGGER AS $$
DECLARE
  default_teacher_id UUID;
BEGIN
  -- Se teacher_id for NULL, buscar admin/teacher do tenant
  IF NEW.teacher_id IS NULL THEN
    -- Buscar primeiro teacher/admin do mesmo tenant ou do sistema
    SELECT id INTO default_teacher_id
    FROM profiles
    WHERE user_type IN ('teacher', 'admin')
      AND (NEW.tenant_id IS NULL OR tenant_id = NEW.tenant_id OR tenant_id IS NULL)
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_teacher_id IS NOT NULL THEN
      NEW.teacher_id := default_teacher_id;
      RAISE NOTICE 'Auto-associado aluno órfão % ao professor %', NEW.user_id, default_teacher_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS ensure_student_has_teacher ON students;
CREATE TRIGGER ensure_student_has_teacher
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_orphan_students();

-- Verificar resultado
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM students WHERE teacher_id IS NULL;
  RAISE NOTICE 'Alunos órfãos restantes: %', orphan_count;
END $$;