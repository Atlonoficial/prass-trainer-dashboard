-- ===================================================
-- CRIAR TABELA: nutrition_formulas
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- 1. Criar a tabela nutrition_formulas
CREATE TABLE IF NOT EXISTS public.nutrition_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_nutrition_formulas_created_by 
  ON public.nutrition_formulas(created_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_formulas_category 
  ON public.nutrition_formulas(category);

-- 3. Enable RLS
ALTER TABLE public.nutrition_formulas ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can view own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can create own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can update own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Users can delete own formulas" ON public.nutrition_formulas;
DROP POLICY IF EXISTS "Teachers can view students formulas" ON public.nutrition_formulas;

-- 5. Criar políticas RLS
-- Usuários podem ver suas próprias fórmulas
CREATE POLICY "Users can view own formulas" 
ON public.nutrition_formulas 
FOR SELECT 
USING (auth.uid() = created_by);

-- Usuários podem criar suas próprias fórmulas
CREATE POLICY "Users can create own formulas" 
ON public.nutrition_formulas 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Usuários podem atualizar suas próprias fórmulas
CREATE POLICY "Users can update own formulas" 
ON public.nutrition_formulas 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Usuários podem deletar suas próprias fórmulas
CREATE POLICY "Users can delete own formulas" 
ON public.nutrition_formulas 
FOR DELETE 
USING (auth.uid() = created_by);

-- Professores podem ver fórmulas dos seus alunos
CREATE POLICY "Teachers can view students formulas" 
ON public.nutrition_formulas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = nutrition_formulas.created_by
    AND s.teacher_id = auth.uid()
  )
);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nutrition_formulas_updated_at ON public.nutrition_formulas;
CREATE TRIGGER update_nutrition_formulas_updated_at
BEFORE UPDATE ON public.nutrition_formulas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================
-- VERIFICAÇÃO
-- ===================================================
SELECT 
  'nutrition_formulas' as table_name,
  COUNT(*) as row_count
FROM public.nutrition_formulas;

-- ===================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- 2. Cole este script e execute
-- 3. Atualize a página do dashboard (F5)
-- ===================================================
