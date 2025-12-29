-- Criar tabela para histórico de resets de pontuação
CREATE TABLE public.points_reset_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reset_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled', 'automatic'
  affected_students INTEGER NOT NULL DEFAULT 0,
  total_points_reset INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  backup_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Adicionar campos na tabela gamification_settings existente
ALTER TABLE public.gamification_settings 
ADD COLUMN IF NOT EXISTS auto_reset_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS next_reset_date DATE,
ADD COLUMN IF NOT EXISTS reset_frequency TEXT DEFAULT 'manual'; -- 'manual', 'monthly', 'quarterly'

-- Políticas RLS para points_reset_history
ALTER TABLE public.points_reset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can create reset history" 
ON public.points_reset_history 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view own reset history" 
ON public.points_reset_history 
FOR SELECT 
USING (auth.uid() = teacher_id);

-- Função para resetar pontos de todos os estudantes de um professor
CREATE OR REPLACE FUNCTION public.reset_all_student_points(
  p_teacher_id UUID,
  p_reason TEXT DEFAULT 'Manual reset'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_students INTEGER := 0;
  v_total_points_reset INTEGER := 0;
  v_backup_data JSONB := '{}';
  v_student_record RECORD;
BEGIN
  -- Verificar se o usuário é professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_teacher_id AND user_type = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Only teachers can reset student points';
  END IF;

  -- Criar backup dos dados antes do reset
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', up.user_id,
      'total_points', up.total_points,
      'level', up.level,
      'current_streak', up.current_streak,
      'longest_streak', up.longest_streak
    )
  ) INTO v_backup_data
  FROM user_points up
  JOIN students s ON s.user_id = up.user_id
  WHERE s.teacher_id = p_teacher_id;

  -- Contar estudantes afetados e total de pontos
  SELECT 
    COUNT(*), 
    COALESCE(SUM(up.total_points), 0)
  INTO v_affected_students, v_total_points_reset
  FROM user_points up
  JOIN students s ON s.user_id = up.user_id
  WHERE s.teacher_id = p_teacher_id;

  -- Resetar pontos de todos os estudantes deste professor
  UPDATE user_points 
  SET 
    total_points = 0,
    level = 1,
    current_streak = 0,
    longest_streak = 0,
    updated_at = NOW()
  WHERE user_id IN (
    SELECT s.user_id 
    FROM students s 
    WHERE s.teacher_id = p_teacher_id
  );

  -- Registrar no histórico
  INSERT INTO points_reset_history (
    teacher_id,
    reset_type,
    affected_students,
    total_points_reset,
    reason,
    backup_data
  ) VALUES (
    p_teacher_id,
    'manual',
    v_affected_students,
    v_total_points_reset,
    p_reason,
    v_backup_data
  );

  RETURN jsonb_build_object(
    'success', true,
    'affected_students', v_affected_students,
    'total_points_reset', v_total_points_reset,
    'message', 'Points reset successfully'
  );
END;
$$;