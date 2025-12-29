-- ===================================================
-- TABELA advanced_techniques
-- Execute no SQL Editor do Supabase
-- ===================================================

CREATE TABLE IF NOT EXISTS public.advanced_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Intensidade',
  difficulty TEXT NOT NULL DEFAULT 'Intermediário',
  muscles TEXT[],
  instructions TEXT,
  examples TEXT[],
  video_url TEXT,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advanced_techniques_creator ON public.advanced_techniques(created_by);
ALTER TABLE public.advanced_techniques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "at_user_all" ON public.advanced_techniques;
CREATE POLICY "at_user_all" ON public.advanced_techniques FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Verificar
SELECT 'advanced_techniques' as tabela, COUNT(*) as registros FROM public.advanced_techniques;
