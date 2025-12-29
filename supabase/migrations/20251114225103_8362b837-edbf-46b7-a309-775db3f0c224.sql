-- ============================================
-- FASE 1: ADICIONAR FOREIGN KEYS E RLS POLICY
-- ============================================

-- 1. Adicionar foreign key para student_id
ALTER TABLE manual_charges
ADD CONSTRAINT fk_manual_charges_student
FOREIGN KEY (student_id) 
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 2. Adicionar foreign key para plan_id (opcional, pode ser NULL)
ALTER TABLE manual_charges
ADD CONSTRAINT fk_manual_charges_plan
FOREIGN KEY (plan_id) 
REFERENCES plan_catalog(id)
ON DELETE SET NULL;

-- 3. Adicionar foreign key para teacher_id
ALTER TABLE manual_charges
ADD CONSTRAINT fk_manual_charges_teacher
FOREIGN KEY (teacher_id) 
REFERENCES profiles(id)
ON DELETE CASCADE;

-- 4. Adicionar RLS policy para DELETE
CREATE POLICY "Teachers can delete own charges"
ON manual_charges
FOR DELETE
USING (auth.uid() = teacher_id);

-- Comentário explicativo
COMMENT ON POLICY "Teachers can delete own charges" ON manual_charges IS 
  'Permite que professores deletem cobranças criadas por eles';