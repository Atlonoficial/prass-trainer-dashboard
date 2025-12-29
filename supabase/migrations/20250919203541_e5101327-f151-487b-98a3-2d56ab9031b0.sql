-- NUTRITION SYSTEM 2.0: Nova tabela meal_plans com arquitetura limpa
-- Esta é uma implementação completamente nova e robusta

-- 1. Criar nova tabela meal_plans
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  meals_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_students UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  total_calories INTEGER DEFAULT 0,
  total_protein NUMERIC(10,2) DEFAULT 0,
  total_carbs NUMERIC(10,2) DEFAULT 0,
  total_fat NUMERIC(10,2) DEFAULT 0,
  duration_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX idx_meal_plans_created_by ON public.meal_plans(created_by);
CREATE INDEX idx_meal_plans_assigned_students ON public.meal_plans USING GIN(assigned_students);
CREATE INDEX idx_meal_plans_status ON public.meal_plans(status);

-- 3. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meal_plans_updated_at();

-- 4. RLS Policies simples e diretas
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Professores podem gerenciar seus próprios planos
CREATE POLICY "Teachers can manage own meal plans"
ON public.meal_plans
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Estudantes podem ver planos atribuídos a eles
CREATE POLICY "Students can view assigned meal plans"
ON public.meal_plans
FOR SELECT
USING (
  auth.uid() = ANY(assigned_students) 
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid() 
    AND s.teacher_id = meal_plans.created_by
  )
);

-- 5. Função auxiliar para calcular totais nutricionais
CREATE OR REPLACE FUNCTION public.calculate_meal_plan_totals(meals_data_param jsonb)
RETURNS TABLE(
  total_calories INTEGER,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  meal jsonb;
  food jsonb;
  calories_sum INTEGER := 0;
  protein_sum NUMERIC := 0;
  carbs_sum NUMERIC := 0;
  fat_sum NUMERIC := 0;
BEGIN
  -- Iterar por cada refeição
  FOR meal IN SELECT jsonb_array_elements(meals_data_param)
  LOOP
    -- Iterar por cada alimento na refeição
    FOR food IN SELECT jsonb_array_elements(meal->'foods')
    LOOP
      calories_sum := calories_sum + COALESCE((food->>'calories')::INTEGER, 0);
      protein_sum := protein_sum + COALESCE((food->>'protein')::NUMERIC, 0);
      carbs_sum := carbs_sum + COALESCE((food->>'carbs')::NUMERIC, 0);
      fat_sum := fat_sum + COALESCE((food->>'fat')::NUMERIC, 0);
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT calories_sum, protein_sum, carbs_sum, fat_sum;
END;
$$;