-- ===================================================
-- CRIAR TABELA: training_locations
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- 1. Criar a tabela training_locations
CREATE TABLE IF NOT EXISTS public.training_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gym' CHECK (type IN ('gym', 'studio', 'outdoor', 'online', 'home')),
  address TEXT,
  description TEXT,
  google_maps_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_training_locations_teacher_id 
  ON public.training_locations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_training_locations_is_active 
  ON public.training_locations(is_active);

-- 3. Enable RLS
ALTER TABLE public.training_locations ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Teachers can view own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can create training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can update own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Teachers can delete own training locations" ON public.training_locations;
DROP POLICY IF EXISTS "Students can view active training locations" ON public.training_locations;

-- 5. Criar políticas RLS
-- Professores podem ver seus próprios locais
CREATE POLICY "Teachers can view own training locations" 
ON public.training_locations 
FOR SELECT 
USING (auth.uid() = teacher_id);

-- Professores podem criar locais
CREATE POLICY "Teachers can create training locations" 
ON public.training_locations 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

-- Professores podem atualizar seus locais
CREATE POLICY "Teachers can update own training locations" 
ON public.training_locations 
FOR UPDATE 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Professores podem deletar seus locais
CREATE POLICY "Teachers can delete own training locations" 
ON public.training_locations 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Alunos podem ver locais ativos do professor deles
CREATE POLICY "Students can view active training locations"
ON public.training_locations
FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = training_locations.teacher_id
    AND s.user_id = auth.uid()
  )
);

-- 6. Trigger para updated_at
DROP TRIGGER IF EXISTS update_training_locations_updated_at ON public.training_locations;
CREATE TRIGGER update_training_locations_updated_at
BEFORE UPDATE ON public.training_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Habilitar realtime
ALTER TABLE public.training_locations REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.training_locations;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Tabela já está na publicação
END $$;

-- ===================================================
-- VERIFICAÇÃO
-- ===================================================
SELECT 
  'training_locations' as table_name,
  COUNT(*) as row_count
FROM public.training_locations;

-- ===================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- 2. Cole este script e execute
-- 3. Atualize a página do dashboard (F5)
-- ===================================================
