-- Criar tabela de conquistas/achievements
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  icon text DEFAULT 'trophy',
  rarity text NOT NULL DEFAULT 'bronze' CHECK (rarity IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points_reward integer NOT NULL DEFAULT 0,
  condition_type text NOT NULL CHECK (condition_type IN ('training_count', 'streak_days', 'progress_milestone', 'appointment_count', 'custom')),
  condition_value integer NOT NULL DEFAULT 1,
  condition_data jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de conquistas dos usuários
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Criar tabela de atividades de gamificação
CREATE TABLE public.gamification_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('training_completed', 'progress_logged', 'appointment_attended', 'streak_milestone', 'achievement_earned', 'reward_redeemed', 'level_up')),
  points_earned integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar colunas na tabela user_points se não existirem
ALTER TABLE public.user_points 
ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date date,
ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Habilitar RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_activities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para achievements
CREATE POLICY "Teachers can manage own achievements" ON public.achievements
FOR ALL USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Students can view teacher achievements" ON public.achievements
FOR SELECT USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() AND s.teacher_id = created_by
  )
);

-- Políticas RLS para user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student achievements" ON public.user_achievements
FOR SELECT USING (is_teacher_of(auth.uid(), user_id));

CREATE POLICY "System can create user achievements" ON public.user_achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para gamification_activities
CREATE POLICY "Users can view own activities" ON public.gamification_activities
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student activities" ON public.gamification_activities
FOR SELECT USING (is_teacher_of(auth.uid(), user_id));

CREATE POLICY "System can create activities" ON public.gamification_activities
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_achievements_updated_at
BEFORE UPDATE ON public.achievements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular nível baseado em pontos
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS integer AS $$
BEGIN
  -- Sistema de níveis: Nível = sqrt(pontos / 100) + 1
  RETURN FLOOR(SQRT(points / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Função para dar pontos ao usuário
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_points integer,
  p_activity_type text,
  p_description text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
  current_points integer := 0;
  new_level integer;
  old_level integer := 1;
BEGIN
  -- Buscar nível atual
  SELECT level INTO old_level FROM public.user_points WHERE user_id = p_user_id;
  IF old_level IS NULL THEN old_level := 1; END IF;

  -- Inserir atividade
  INSERT INTO public.gamification_activities (
    user_id, activity_type, points_earned, description, metadata
  ) VALUES (
    p_user_id, p_activity_type, p_points, p_description, p_metadata
  );

  -- Upsert pontos do usuário
  INSERT INTO public.user_points (user_id, total_points, level, last_activity_date)
  VALUES (p_user_id, p_points, public.calculate_user_level(p_points), CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + p_points,
    level = public.calculate_user_level(user_points.total_points + p_points),
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  RETURNING level INTO new_level;

  -- Verificar se subiu de nível
  IF new_level > old_level THEN
    -- Dar pontos bonus por subir de nível
    UPDATE public.user_points 
    SET total_points = total_points + (new_level * 10)
    WHERE user_id = p_user_id;
    
    -- Registrar atividade de nível
    INSERT INTO public.gamification_activities (
      user_id, activity_type, points_earned, description, metadata
    ) VALUES (
      p_user_id, 'level_up', new_level * 10, 
      'Subiu para o nível ' || new_level, 
      jsonb_build_object('level', new_level)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar e conceder conquistas
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS void AS $$
DECLARE
  achievement record;
  user_data record;
  should_award boolean;
BEGIN
  -- Buscar dados do usuário
  SELECT 
    up.total_points,
    up.current_streak,
    up.longest_streak,
    COUNT(CASE WHEN ga.activity_type = 'training_completed' THEN 1 END) as training_count,
    COUNT(CASE WHEN ga.activity_type = 'appointment_attended' THEN 1 END) as appointment_count
  INTO user_data
  FROM public.user_points up
  LEFT JOIN public.gamification_activities ga ON ga.user_id = up.user_id
  WHERE up.user_id = p_user_id
  GROUP BY up.user_id, up.total_points, up.current_streak, up.longest_streak;

  -- Se não há dados, criar registro inicial
  IF user_data IS NULL THEN
    INSERT INTO public.user_points (user_id) VALUES (p_user_id);
    RETURN;
  END IF;

  -- Verificar conquistas disponíveis do professor do aluno
  FOR achievement IN 
    SELECT a.* FROM public.achievements a
    JOIN public.students s ON s.teacher_id = a.created_by
    WHERE s.user_id = p_user_id
    AND a.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
    )
  LOOP
    should_award := false;
    
    CASE achievement.condition_type
      WHEN 'training_count' THEN
        should_award := user_data.training_count >= achievement.condition_value;
      WHEN 'streak_days' THEN
        should_award := user_data.current_streak >= achievement.condition_value;
      WHEN 'appointment_count' THEN
        should_award := user_data.appointment_count >= achievement.condition_value;
      WHEN 'progress_milestone' THEN
        should_award := user_data.total_points >= achievement.condition_value;
    END CASE;
    
    IF should_award THEN
      -- Conceder conquista
      INSERT INTO public.user_achievements (user_id, achievement_id, points_earned)
      VALUES (p_user_id, achievement.id, achievement.points_reward);
      
      -- Dar pontos pela conquista
      PERFORM public.award_points(
        p_user_id,
        achievement.points_reward,
        'achievement_earned',
        'Conquistou: ' || achievement.title,
        jsonb_build_object('achievement_id', achievement.id)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar conquistas após ganhar pontos
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS trigger AS $$
BEGIN
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_achievements_after_activity
AFTER INSERT ON public.gamification_activities
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_achievements();

-- Indices para performance
CREATE INDEX idx_achievements_created_by ON public.achievements(created_by);
CREATE INDEX idx_achievements_active ON public.achievements(is_active);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON public.user_achievements(earned_at);
CREATE INDEX idx_gamification_activities_user_id ON public.gamification_activities(user_id);
CREATE INDEX idx_gamification_activities_type ON public.gamification_activities(activity_type);
CREATE INDEX idx_gamification_activities_created_at ON public.gamification_activities(created_at);

-- Inserir conquistas padrão
INSERT INTO public.achievements (title, description, icon, rarity, points_reward, condition_type, condition_value, created_by, is_active) VALUES
('Primeiro Treino', 'Complete seu primeiro treino!', 'dumbbell', 'bronze', 50, 'training_count', 1, '0d5398c2-278e-4853-b980-f36961795e52', true),
('Dedicado', 'Complete 10 treinos', 'target', 'silver', 200, 'training_count', 10, '0d5398c2-278e-4853-b980-f36961795e52', true),
('Atleta', 'Complete 50 treinos', 'trophy', 'gold', 500, 'training_count', 50, '0d5398c2-278e-4853-b980-f36961795e52', true),
('Sequência', 'Mantenha um streak de 7 dias', 'flame', 'silver', 300, 'streak_days', 7, '0d5398c2-278e-4853-b980-f36961795e52', true),
('Imparável', 'Mantenha um streak de 30 dias', 'zap', 'gold', 1000, 'streak_days', 30, '0d5398c2-278e-4853-b980-f36961795e52', true),
('Pontual', 'Compareça a 5 consultas', 'calendar-check', 'bronze', 150, 'appointment_count', 5, '0d5398c2-278e-4853-b980-f36961795e52', true);