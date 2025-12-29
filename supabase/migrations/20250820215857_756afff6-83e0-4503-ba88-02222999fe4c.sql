-- Security Fix: Fix remaining functions with mutable search paths

-- Fix calculate_user_level function
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Sistema de níveis: Nível = sqrt(pontos / 100) + 1
  RETURN FLOOR(SQRT(points / 100.0)) + 1;
END;
$function$;

-- Fix award_points function
CREATE OR REPLACE FUNCTION public.award_points(p_user_id uuid, p_points integer, p_activity_type text, p_description text DEFAULT ''::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix check_and_award_achievements function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix trigger_check_achievements function
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$function$;

-- Fix update_monthly_rankings function
CREATE OR REPLACE FUNCTION public.update_monthly_rankings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  student_record RECORD;
  position_counter INTEGER;
BEGIN
  -- Para cada professor, calcular rankings
  FOR student_record IN
    SELECT DISTINCT s.teacher_id
    FROM students s
    WHERE s.teacher_id IS NOT NULL
  LOOP
    -- Limpar rankings existentes do mês atual
    DELETE FROM public.monthly_rankings 
    WHERE teacher_id = student_record.teacher_id 
    AND month = current_month;
    
    -- Inserir novos rankings ordenados por pontos
    position_counter := 1;
    
    INSERT INTO public.monthly_rankings (user_id, teacher_id, month, position, total_points)
    SELECT 
      up.user_id,
      student_record.teacher_id,
      current_month,
      ROW_NUMBER() OVER (ORDER BY up.total_points DESC),
      up.total_points
    FROM user_points up
    JOIN students s ON s.user_id = up.user_id
    WHERE s.teacher_id = student_record.teacher_id
    ORDER BY up.total_points DESC;
  END LOOP;
END;
$function$;

-- Fix award_points_enhanced function
CREATE OR REPLACE FUNCTION public.award_points_enhanced(p_user_id uuid, p_activity_type text, p_description text DEFAULT ''::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_custom_points integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  points_to_award INTEGER := 0;
  teacher_id_var UUID;
  settings RECORD;
  current_points INTEGER := 0;
  new_level INTEGER;
  old_level INTEGER := 1;
  daily_points INTEGER := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Buscar teacher_id do usuário
  SELECT s.teacher_id INTO teacher_id_var
  FROM students s
  WHERE s.user_id = p_user_id
  LIMIT 1;
  
  IF teacher_id_var IS NULL THEN
    RETURN; -- Não é um estudante válido
  END IF;
  
  -- Buscar configurações do professor
  SELECT * INTO settings
  FROM gamification_settings gs
  WHERE gs.teacher_id = teacher_id_var;
  
  -- Se não tem configurações, usar padrões
  IF NOT FOUND THEN
    INSERT INTO gamification_settings (teacher_id) VALUES (teacher_id_var);
    SELECT * INTO settings FROM gamification_settings WHERE teacher_id = teacher_id_var;
  END IF;
  
  -- Calcular pontos baseado na atividade
  IF p_custom_points IS NOT NULL THEN
    points_to_award := p_custom_points;
  ELSE
    CASE p_activity_type
      WHEN 'training_completed' THEN points_to_award := settings.points_workout;
      WHEN 'daily_checkin' THEN points_to_award := settings.points_checkin;
      WHEN 'meal_logged' THEN points_to_award := settings.points_meal_log;
      WHEN 'progress_updated' THEN points_to_award := settings.points_progress_update;
      WHEN 'goal_achieved' THEN points_to_award := settings.points_goal_achieved;
      WHEN 'assessment_completed' THEN points_to_award := settings.points_assessment;
      WHEN 'medical_exam_uploaded' THEN points_to_award := settings.points_medical_exam;
      WHEN 'ai_interaction' THEN points_to_award := settings.points_ai_interaction;
      WHEN 'teacher_message' THEN points_to_award := settings.points_teacher_message;
      WHEN 'appointment_attended' THEN points_to_award := settings.points_workout;
      ELSE points_to_award := 10; -- Padrão
    END CASE;
  END IF;
  
  -- Verificar limite diário
  SELECT COALESCE(SUM(ga.points_earned), 0) INTO daily_points
  FROM gamification_activities ga
  WHERE ga.user_id = p_user_id
  AND DATE(ga.created_at) = today_date;
  
  IF daily_points + points_to_award > settings.max_daily_points THEN
    points_to_award := GREATEST(0, settings.max_daily_points - daily_points);
  END IF;
  
  IF points_to_award <= 0 THEN
    RETURN; -- Não dar pontos negativos ou zero
  END IF;
  
  -- Buscar nível atual
  SELECT level, total_points INTO old_level, current_points 
  FROM user_points 
  WHERE user_id = p_user_id;
  
  IF old_level IS NULL THEN 
    old_level := 1; 
    current_points := 0;
  END IF;
  
  -- Inserir atividade
  INSERT INTO gamification_activities (
    user_id, activity_type, points_earned, description, metadata
  ) VALUES (
    p_user_id, p_activity_type, points_to_award, p_description, p_metadata
  );
  
  -- Upsert pontos do usuário
  INSERT INTO user_points (user_id, total_points, level, last_activity_date)
  VALUES (p_user_id, points_to_award, public.calculate_user_level(points_to_award), CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + points_to_award,
    level = public.calculate_user_level(user_points.total_points + points_to_award),
    last_activity_date = CURRENT_DATE,
    updated_at = now()
  RETURNING level INTO new_level;
  
  -- Verificar se subiu de nível
  IF new_level > old_level THEN
    -- Dar pontos bonus por subir de nível
    UPDATE user_points 
    SET total_points = total_points + settings.level_up_bonus
    WHERE user_id = p_user_id;
    
    -- Registrar atividade de nível
    INSERT INTO gamification_activities (
      user_id, activity_type, points_earned, description, metadata
    ) VALUES (
      p_user_id, 'level_up', settings.level_up_bonus, 
      'Subiu para o nível ' || new_level, 
      jsonb_build_object('level', new_level, 'previous_level', old_level)
    );
  END IF;
  
  -- Atualizar rankings mensais
  PERFORM update_monthly_rankings();
END;
$function$;

-- Fix auto_award_workout_points function
CREATE OR REPLACE FUNCTION public.auto_award_workout_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix auto_award_meal_points function
CREATE OR REPLACE FUNCTION public.auto_award_meal_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
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
$function$;

-- Fix auto_award_progress_points function
CREATE OR REPLACE FUNCTION public.auto_award_progress_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  PERFORM public.award_points_enhanced(
    NEW.user_id,
    'progress_updated',
    'Progresso atualizado',
    jsonb_build_object('progress_type', NEW.type, 'value', NEW.value)
  );
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  single_teacher_id uuid := '0d5398c2-278e-4853-b980-f36961795e52'::uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name, user_type)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')
  );

  -- Only link students to teacher, not teachers themselves
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'student') = 'student' 
     AND NEW.id != single_teacher_id THEN
    INSERT INTO public.students (user_id, teacher_id)
    VALUES (NEW.id, single_teacher_id)
    ON CONFLICT (user_id) DO UPDATE SET
      teacher_id = single_teacher_id,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;