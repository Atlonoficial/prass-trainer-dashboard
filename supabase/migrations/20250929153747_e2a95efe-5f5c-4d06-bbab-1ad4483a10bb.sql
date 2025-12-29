-- FINAL SECURITY FIXES - REMAINING FUNCTIONS
-- Fix the last remaining functions that lack search_path configuration

-- 1. Fix can_insert_notification function
CREATE OR REPLACE FUNCTION public.can_insert_notification(p_user_id uuid, p_target_users uuid[] DEFAULT NULL::uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é um professor
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND user_type = 'teacher'
  ) THEN
    RETURN false;
  END IF;
  
  -- Se não há usuários alvo específicos, permitir (notificação geral)  
  IF p_target_users IS NULL OR array_length(p_target_users, 1) IS NULL OR p_target_users = '{}' THEN
    RETURN true;
  END IF;
  
  -- Verificar se todos os usuários alvo são estudantes do professor
  RETURN NOT EXISTS (
    SELECT 1 
    FROM unnest(p_target_users) AS target_user_id
    WHERE NOT EXISTS (
      SELECT 1 
      FROM students s 
      WHERE s.user_id = target_user_id 
        AND s.teacher_id = p_user_id
    )
  );
END;
$$;

-- 2. Fix create_meal_rotation function
CREATE OR REPLACE FUNCTION public.create_meal_rotation(p_nutrition_plan_id uuid, p_meal_type text, p_week_number integer, p_day_of_week integer, p_meal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rotation_id UUID;
BEGIN
  -- Inserir ou atualizar rotação de refeição
  INSERT INTO meal_rotations (
    nutrition_plan_id,
    meal_type,
    week_number,
    day_of_week,
    meal_id
  )
  VALUES (
    p_nutrition_plan_id,
    p_meal_type,
    p_week_number,
    p_day_of_week,
    p_meal_id
  )
  ON CONFLICT (nutrition_plan_id, meal_type, week_number, day_of_week)
  DO UPDATE SET meal_id = EXCLUDED.meal_id
  RETURNING id INTO rotation_id;
  
  RETURN rotation_id;
END;
$$;