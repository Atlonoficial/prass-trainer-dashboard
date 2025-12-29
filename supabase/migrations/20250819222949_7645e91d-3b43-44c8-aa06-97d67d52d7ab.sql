-- Create evaluation templates for standardized questionnaires
CREATE TABLE public.evaluation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  physical_measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create evaluations table for complete evaluation sessions
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  template_id UUID REFERENCES public.evaluation_templates(id),
  evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  overall_score NUMERIC,
  teacher_notes TEXT,
  student_notes TEXT,
  physical_measurements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluation responses for Q&A data
CREATE TABLE public.evaluation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'text',
  response_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_templates
CREATE POLICY "Teachers can create templates" ON public.evaluation_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can view own templates" ON public.evaluation_templates
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Teachers can update own templates" ON public.evaluation_templates
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for evaluations
CREATE POLICY "Teachers can create evaluations" ON public.evaluations
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view student evaluations" ON public.evaluations
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view own evaluations" ON public.evaluations
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can update evaluations" ON public.evaluations
  FOR UPDATE USING (auth.uid() = teacher_id);

-- RLS Policies for evaluation_responses
CREATE POLICY "Teachers can create responses" ON public.evaluation_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_responses.evaluation_id 
      AND e.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view responses" ON public.evaluation_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_responses.evaluation_id 
      AND e.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own responses" ON public.evaluation_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.evaluations e 
      WHERE e.id = evaluation_responses.evaluation_id 
      AND e.student_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default evaluation templates
INSERT INTO public.evaluation_templates (name, description, questions, physical_measurements, created_by) VALUES 
(
  'Avaliação Física Completa',
  'Avaliação física padrão com medidas antropométricas e questionário de saúde',
  '[
    {
      "id": "health_issues",
      "type": "multiselect",
      "question": "Possui alguma das seguintes condições de saúde?",
      "options": ["Diabetes", "Hipertensão", "Problemas cardíacos", "Lesões articulares", "Dores nas costas", "Nenhuma"]
    },
    {
      "id": "exercise_frequency",
      "type": "select",
      "question": "Com que frequência pratica exercícios?",
      "options": ["Nunca", "1-2x por semana", "3-4x por semana", "5+ por semana", "Diariamente"]
    },
    {
      "id": "goals",
      "type": "multiselect",
      "question": "Quais são seus principais objetivos?",
      "options": ["Perder peso", "Ganhar massa muscular", "Melhorar condicionamento", "Reabilitação", "Saúde geral"]
    },
    {
      "id": "sleep_quality",
      "type": "scale",
      "question": "Como avalia a qualidade do seu sono? (1-10)",
      "min": 1,
      "max": 10
    },
    {
      "id": "stress_level",
      "type": "scale",
      "question": "Nível de estresse no dia a dia? (1-10)",
      "min": 1,
      "max": 10
    },
    {
      "id": "additional_notes",
      "type": "textarea",
      "question": "Observações adicionais ou informações relevantes:"
    }
  ]'::jsonb,
  '[
    {"name": "weight", "label": "Peso", "unit": "kg", "required": true},
    {"name": "height", "label": "Altura", "unit": "cm", "required": true},
    {"name": "body_fat", "label": "% Gordura", "unit": "%", "required": false},
    {"name": "muscle_mass", "label": "Massa Muscular", "unit": "kg", "required": false},
    {"name": "waist", "label": "Cintura", "unit": "cm", "required": false},
    {"name": "chest", "label": "Peito", "unit": "cm", "required": false},
    {"name": "arm", "label": "Braço", "unit": "cm", "required": false},
    {"name": "thigh", "label": "Coxa", "unit": "cm", "required": false}
  ]'::jsonb,
  '0d5398c2-278e-4853-b980-f36961795e52'::uuid
),
(
  'Reavaliação Mensal',
  'Avaliação de acompanhamento mensal simplificada',
  '[
    {
      "id": "progress_satisfaction",
      "type": "scale",
      "question": "Satisfação com o progresso atual (1-10):",
      "min": 1,
      "max": 10
    },
    {
      "id": "training_adherence",
      "type": "select",
      "question": "Aderência aos treinos no último mês:",
      "options": ["Muito baixa", "Baixa", "Moderada", "Alta", "Muito alta"]
    },
    {
      "id": "difficulties",
      "type": "multiselect",
      "question": "Principais dificuldades enfrentadas:",
      "options": ["Falta de tempo", "Motivação", "Dores/lesões", "Alimentação", "Sono", "Nenhuma"]
    },
    {
      "id": "monthly_goals",
      "type": "textarea",
      "question": "Objetivos para o próximo mês:"
    }
  ]'::jsonb,
  '[
    {"name": "weight", "label": "Peso", "unit": "kg", "required": true},
    {"name": "body_fat", "label": "% Gordura", "unit": "%", "required": false},
    {"name": "muscle_mass", "label": "Massa Muscular", "unit": "kg", "required": false}
  ]'::jsonb,
  '0d5398c2-278e-4853-b980-f36961795e52'::uuid
);