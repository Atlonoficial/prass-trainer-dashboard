-- ========================================
-- FASE 1: CORREÇÃO SISTEMA DE PREDEFINIÇÕES
-- ========================================

-- 1. Criar tabela advanced_techniques
CREATE TABLE IF NOT EXISTS public.advanced_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Intensidade', 'Volume', 'Tempo', 'Método')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Iniciante', 'Intermediário', 'Avançado')),
  muscles TEXT[] DEFAULT '{}',
  instructions TEXT,
  examples TEXT[] DEFAULT '{}',
  video_url TEXT,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Verificar/criar tabela workouts se não existir
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB DEFAULT '[]',
  difficulty TEXT CHECK (difficulty IN ('Iniciante', 'Intermediário', 'Avançado')),
  muscle_groups TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  template_category TEXT,
  image_url TEXT,
  estimated_duration INTEGER,
  estimated_calories INTEGER,
  is_template BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS nas tabelas
ALTER TABLE public.advanced_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para advanced_techniques
CREATE POLICY "Teachers can manage own advanced techniques" 
ON public.advanced_techniques 
FOR ALL 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Students can view teacher advanced techniques" 
ON public.advanced_techniques 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM students s 
  WHERE s.user_id = auth.uid() AND s.teacher_id = advanced_techniques.created_by
));

-- 5. Políticas RLS para workouts (se ainda não existirem)
DO $$
BEGIN
  -- Verificar se as políticas já existem antes de criar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workouts' AND policyname = 'Teachers can manage own workouts'
  ) THEN
    EXECUTE 'CREATE POLICY "Teachers can manage own workouts" 
    ON public.workouts 
    FOR ALL 
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workouts' AND policyname = 'Students can view teacher workouts'
  ) THEN
    EXECUTE 'CREATE POLICY "Students can view teacher workouts" 
    ON public.workouts 
    FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM students s 
      WHERE s.user_id = auth.uid() AND s.teacher_id = workouts.created_by
    ))';
  END IF;
END $$;

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_advanced_techniques_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_advanced_techniques_updated_at
    BEFORE UPDATE ON public.advanced_techniques
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_workouts_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_advanced_techniques_created_by ON public.advanced_techniques(created_by);
CREATE INDEX IF NOT EXISTS idx_advanced_techniques_category ON public.advanced_techniques(category);
CREATE INDEX IF NOT EXISTS idx_workouts_created_by ON public.workouts(created_by);
CREATE INDEX IF NOT EXISTS idx_workouts_template ON public.workouts(is_template) WHERE is_template = true;