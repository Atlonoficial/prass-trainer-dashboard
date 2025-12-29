-- ===================================================
-- TABELA progress (avaliações)
-- Execute no SQL Editor do Supabase
-- ===================================================

CREATE TABLE IF NOT EXISTS public.progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  workout_id UUID,
  meal_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON public.progress(date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_type ON public.progress(type);
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_user_own" ON public.progress;
DROP POLICY IF EXISTS "p_teacher_view" ON public.progress;
DROP POLICY IF EXISTS "p_insert" ON public.progress;

CREATE POLICY "p_user_own" ON public.progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "p_teacher_view" ON public.progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.user_id = progress.user_id AND s.teacher_id = auth.uid())
);

-- Verificar
SELECT 'progress' as tabela, COUNT(*) as registros FROM public.progress;
