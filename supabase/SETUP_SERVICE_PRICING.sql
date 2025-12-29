-- ===================================================
-- TABELA service_pricing E OUTRAS TABELAS FALTANTES
-- Execute no SQL Editor do Supabase
-- ===================================================

-- PARTE 1: service_pricing
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'consultation',
  service_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_pricing_teacher ON public.service_pricing(teacher_id);
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_teacher_all" ON public.service_pricing;
CREATE POLICY "sp_teacher_all" ON public.service_pricing FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "sp_students_view" ON public.service_pricing;
CREATE POLICY "sp_students_view" ON public.service_pricing FOR SELECT USING (is_active = true);

-- Verificar
SELECT 'service_pricing' as tabela, COUNT(*) as registros FROM public.service_pricing;
