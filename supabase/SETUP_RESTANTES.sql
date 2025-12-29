-- ===================================================
-- SCRIPT CONSOLIDADO - TABELAS RESTANTES (CORRIGIDO)
-- Execute no SQL Editor do Supabase
-- ===================================================

-- PARTE 1: feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID,
  teacher_id UUID,
  rating INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fb_all" ON public.feedbacks;
CREATE POLICY "fb_all" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);

-- PARTE 2: meals (alimentos)
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meals_all" ON public.meals;
CREATE POLICY "meals_all" ON public.meals FOR ALL USING (true) WITH CHECK (true);

-- PARTE 3: exercises (exercícios)
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  video_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ex_all" ON public.exercises;
CREATE POLICY "ex_all" ON public.exercises FOR ALL USING (true) WITH CHECK (true);

-- PARTE 4: meal_plans (planos nutricionais)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  meals JSONB DEFAULT '[]',
  assigned_students TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mp_all" ON public.meal_plans;
CREATE POLICY "mp_all" ON public.meal_plans FOR ALL USING (true) WITH CHECK (true);

-- PARTE 5: workout_plans (planos de treino)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID,
  created_by UUID,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'intermediate',
  status TEXT DEFAULT 'active',
  exercises_data JSONB DEFAULT '[]',
  assigned_students TEXT[],
  tags TEXT[],
  notes TEXT,
  duration_weeks INTEGER,
  sessions_per_week INTEGER,
  is_template BOOLEAN DEFAULT false,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wp_all" ON public.workout_plans;
CREATE POLICY "wp_all" ON public.workout_plans FOR ALL USING (true) WITH CHECK (true);

-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('feedbacks', 'meals', 'exercises', 'meal_plans', 'workout_plans')
ORDER BY table_name;
