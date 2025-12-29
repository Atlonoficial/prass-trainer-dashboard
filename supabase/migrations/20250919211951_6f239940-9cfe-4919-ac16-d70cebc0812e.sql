-- WORKOUT SYSTEM 2.0 - Nova tabela workout_plans
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exercises_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_students UUID[] DEFAULT '{}',
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  difficulty TEXT DEFAULT 'beginner',
  duration_weeks INTEGER DEFAULT 4,
  sessions_per_week INTEGER DEFAULT 3,
  is_template BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can manage own workout plans" 
ON public.workout_plans 
FOR ALL 
USING (auth.uid() = created_by);

CREATE POLICY "Students can view assigned workout plans" 
ON public.workout_plans 
FOR SELECT 
USING (auth.uid() = ANY(assigned_students));

-- Indexes for performance
CREATE INDEX idx_workout_plans_created_by ON public.workout_plans(created_by);
CREATE INDEX idx_workout_plans_assigned_students ON public.workout_plans USING GIN(assigned_students);
CREATE INDEX idx_workout_plans_status ON public.workout_plans(status);
CREATE INDEX idx_workout_plans_is_template ON public.workout_plans(is_template);

-- Trigger for updated_at
CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();