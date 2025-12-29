-- ===================================================
-- TABELAS DE AVALIAÇÕES COMPLETAS
-- Execute no SQL Editor do Supabase
-- ===================================================

-- PARTE 1: evaluation_templates
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  physical_measurements JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_templates_creator ON public.evaluation_templates(created_by);
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "et_creator_all" ON public.evaluation_templates;
CREATE POLICY "et_creator_all" ON public.evaluation_templates FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- PARTE 2: evaluations
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  template_id UUID,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  overall_score NUMERIC,
  teacher_notes TEXT,
  student_notes TEXT,
  physical_measurements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_student ON public.evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_teacher ON public.evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON public.evaluations(evaluation_date DESC);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "e_teacher_all" ON public.evaluations;
DROP POLICY IF EXISTS "e_student_view" ON public.evaluations;
CREATE POLICY "e_teacher_all" ON public.evaluations FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "e_student_view" ON public.evaluations FOR SELECT USING (auth.uid() = student_id);

-- PARTE 3: evaluation_responses
CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'text',
  response_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_responses_eval ON public.evaluation_responses(evaluation_id);
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "er_teacher_all" ON public.evaluation_responses;
CREATE POLICY "er_teacher_all" ON public.evaluation_responses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.teacher_id = auth.uid())
);
DROP POLICY IF EXISTS "er_student_view" ON public.evaluation_responses;
CREATE POLICY "er_student_view" ON public.evaluation_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = evaluation_id AND e.student_id = auth.uid())
);

-- Verificar
SELECT 'evaluation_templates' as tabela, COUNT(*) as registros FROM public.evaluation_templates
UNION ALL SELECT 'evaluations', COUNT(*) FROM public.evaluations
UNION ALL SELECT 'evaluation_responses', COUNT(*) FROM public.evaluation_responses;
