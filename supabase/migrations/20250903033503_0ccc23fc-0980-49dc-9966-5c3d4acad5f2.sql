-- Criar tabela para templates de notificação
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Policies for notification_templates
CREATE POLICY "Teachers can manage own templates" 
  ON notification_templates 
  FOR ALL 
  USING (auth.uid() = teacher_id);

-- Criar tabela para regras de automação
CREATE TABLE IF NOT EXISTS notification_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  template_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_executed TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE notification_automation_rules ENABLE ROW LEVEL SECURITY;

-- Policies for notification_automation_rules
CREATE POLICY "Teachers can manage own automation rules" 
  ON notification_automation_rules 
  FOR ALL 
  USING (auth.uid() = teacher_id);

-- Adicionar colunas extras na tabela students para melhor segmentação
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS goal_achieved_this_month BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_workout TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS membership_months INTEGER DEFAULT 1;

-- Atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_automation_rules_updated_at
  BEFORE UPDATE ON notification_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();