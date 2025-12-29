-- Adicionar colunas faltantes na tabela students para suportar segmentação avançada
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS goal_achieved_this_month BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_workout TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna onesignal_player_id na tabela profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Criar índices para melhorar performance das queries de segmentação
CREATE INDEX IF NOT EXISTS idx_students_last_activity ON students(last_activity);
CREATE INDEX IF NOT EXISTS idx_students_birth_date ON students(birth_date);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id_last_activity ON students(teacher_id, last_activity);
CREATE INDEX IF NOT EXISTS idx_students_weekly_frequency ON students(weekly_frequency);
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON profiles(onesignal_player_id);

-- Criar trigger para atualizar last_activity automaticamente
CREATE OR REPLACE FUNCTION update_student_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar last_activity quando há atividade de gamificação
  IF TG_TABLE_NAME = 'gamification_activities' THEN
    UPDATE students 
    SET last_activity = NEW.created_at 
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Atualizar last_workout quando há treino completado
  IF TG_TABLE_NAME = 'gamification_activities' AND NEW.activity_type = 'training_completed' THEN
    UPDATE students 
    SET last_workout = NEW.created_at,
        weekly_frequency = COALESCE(weekly_frequency, 0) + 1
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_update_last_activity ON gamification_activities;
CREATE TRIGGER trigger_update_last_activity
  AFTER INSERT ON gamification_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_student_last_activity();

-- Atualizar dados existentes (valores padrão para demonstração)
UPDATE students 
SET 
  last_activity = COALESCE(last_activity, created_at),
  weekly_frequency = COALESCE(weekly_frequency, 2),
  last_workout = COALESCE(last_workout, created_at - INTERVAL '3 days')
WHERE last_activity IS NULL OR weekly_frequency IS NULL OR last_workout IS NULL;