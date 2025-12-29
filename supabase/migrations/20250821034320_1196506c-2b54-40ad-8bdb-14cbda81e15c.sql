-- ================================
-- GAMIFICAÇÃO - TABELAS PRINCIPAIS
-- ================================

-- Tabela de pontos dos usuários
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conquistas dos usuários
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    points_earned INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, achievement_id)
);

-- Tabela de rankings mensais
CREATE TABLE IF NOT EXISTS monthly_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    month DATE NOT NULL,
    position INTEGER NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, teacher_id, month)
);

-- Tabela de itens da loja de recompensas
CREATE TABLE IF NOT EXISTS rewards_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    stock INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    category TEXT DEFAULT 'general',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de resgates de recompensas
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    reward_id UUID NOT NULL,
    points_spent INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de configurações de gamificação por professor
CREATE TABLE IF NOT EXISTS gamification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL UNIQUE,
    points_workout INTEGER NOT NULL DEFAULT 75,
    points_checkin INTEGER NOT NULL DEFAULT 10,
    points_meal_log INTEGER NOT NULL DEFAULT 25,
    points_progress_update INTEGER NOT NULL DEFAULT 100,
    points_goal_achieved INTEGER NOT NULL DEFAULT 300,
    points_assessment INTEGER NOT NULL DEFAULT 150,
    points_medical_exam INTEGER NOT NULL DEFAULT 100,
    points_ai_interaction INTEGER NOT NULL DEFAULT 5,
    points_teacher_message INTEGER NOT NULL DEFAULT 20,
    level_up_bonus INTEGER NOT NULL DEFAULT 50,
    max_daily_points INTEGER NOT NULL DEFAULT 500,
    streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- ÍNDICES PARA PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(level);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_teacher_month ON monthly_rankings(teacher_id, month);
CREATE INDEX IF NOT EXISTS idx_rewards_items_active ON rewards_items(is_active);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_settings_teacher ON gamification_settings(teacher_id);

-- ================================
-- TRIGGERS PARA UPDATED_AT
-- ================================
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_rankings_updated_at BEFORE UPDATE ON monthly_rankings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_items_updated_at BEFORE UPDATE ON rewards_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_settings_updated_at BEFORE UPDATE ON gamification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- TRIGGERS AUTOMÁTICOS PARA GAMIFICAÇÃO
-- ================================

-- Trigger para dar pontos automaticamente quando treino é completado
CREATE OR REPLACE FUNCTION auto_award_workout_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    PERFORM public.award_points_enhanced(
      NEW.user_id,
      'training_completed',
      'Treino completado: ' || COALESCE(NEW.name, 'Treino'),
      jsonb_build_object('workout_id', NEW.id, 'duration', NEW.duration)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para dar pontos automaticamente quando refeição é consumida
CREATE OR REPLACE FUNCTION auto_award_meal_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consumed = true AND (OLD IS NULL OR OLD.consumed = false) THEN
    PERFORM public.award_points_enhanced(
      NEW.user_id,
      'meal_logged',
      'Refeição registrada',
      jsonb_build_object('meal_id', NEW.meal_id, 'rating', NEW.rating)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para dar pontos automaticamente quando progresso é atualizado
CREATE OR REPLACE FUNCTION auto_award_progress_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points_enhanced(
    NEW.user_id,
    'progress_updated',
    'Progresso atualizado',
    jsonb_build_object('progress_type', NEW.type, 'value', NEW.value)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar conquistas automaticamente
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em atividades de gamificação
CREATE TRIGGER check_achievements_on_activity
AFTER INSERT ON gamification_activities
FOR EACH ROW EXECUTE FUNCTION trigger_check_achievements();