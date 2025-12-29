-- FASE 4: RPC submit_feedback_with_points_v5 com validação de custom_questions

CREATE OR REPLACE FUNCTION submit_feedback_with_points_v5(
  p_student_id UUID,
  p_teacher_id UUID,
  p_type TEXT,
  p_rating INTEGER,
  p_message TEXT,
  p_custom_responses JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_feedback_id UUID;
  v_points_earned INTEGER := 5;
  v_settings RECORD;
  v_required_questions JSONB;
  v_question JSONB;
BEGIN
  -- Buscar configurações do professor
  SELECT * INTO v_settings
  FROM teacher_feedback_settings
  WHERE teacher_id = p_teacher_id AND is_active = true;

  -- Se não há configurações ativas, retornar erro
  IF v_settings IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sistema de feedback desativado pelo professor'
    );
  END IF;

  -- Validar perguntas obrigatórias
  IF v_settings.custom_questions IS NOT NULL THEN
    FOR v_question IN SELECT * FROM jsonb_array_elements(v_settings.custom_questions)
    LOOP
      -- Se a pergunta é obrigatória e da categoria selecionada
      IF (v_question->>'required')::boolean = true 
         AND (v_question->>'category')::text = p_type THEN
        -- Verificar se foi respondida
        IF p_custom_responses->(v_question->>'id') IS NULL OR
           p_custom_responses->(v_question->>'id') = 'null'::jsonb OR
           p_custom_responses->(v_question->>'id') = '""'::jsonb THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Pergunta obrigatória não respondida: %s', v_question->>'question')
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Inserir feedback
  INSERT INTO feedbacks (
    student_id,
    teacher_id,
    type,
    rating,
    message,
    metadata
  ) VALUES (
    p_student_id,
    p_teacher_id,
    p_type,
    p_rating,
    p_message,
    jsonb_build_object(
      'source', 'student_dashboard',
      'timestamp', NOW(),
      'custom_responses', p_custom_responses
    )
  )
  RETURNING id INTO v_feedback_id;

  -- Adicionar pontos de gamificação
  INSERT INTO gamification_activities (
    user_id,
    activity_type,
    description,
    points_earned,
    metadata
  ) VALUES (
    p_student_id,
    'feedback_submission',
    format('Feedback enviado: %s', p_type),
    v_points_earned,
    jsonb_build_object(
      'feedback_id', v_feedback_id,
      'rating', p_rating,
      'type', p_type
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'points_earned', v_points_earned
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;