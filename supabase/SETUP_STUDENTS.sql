-- ===================================================
-- TABELA students (alunos)
-- Execute no SQL Editor do Supabase
-- ===================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  active_plan TEXT,
  mode TEXT DEFAULT 'Online',
  membership_status TEXT DEFAULT 'active',
  goals TEXT[],
  membership_expiry DATE,
  weekly_frequency INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON public.students(teacher_id);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "s_teacher_all" ON public.students;
DROP POLICY IF EXISTS "s_student_own" ON public.students;
CREATE POLICY "s_teacher_all" ON public.students FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "s_student_own" ON public.students FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Verificar
SELECT 'students' as tabela, COUNT(*) as registros FROM public.students;
