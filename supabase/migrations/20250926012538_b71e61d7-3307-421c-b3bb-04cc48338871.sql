-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.redeem_reward(uuid);

-- Create function to redeem rewards
CREATE OR REPLACE FUNCTION public.redeem_reward(
  _reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reward_record RECORD;
  v_user_points INTEGER := 0;
  v_redemption_id uuid;
BEGIN
  -- Verificar se o usuário está autenticado
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar a recompensa
  SELECT * INTO v_reward_record
  FROM rewards_items
  WHERE id = _reward_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Recompensa não encontrada ou inativa'
    );
  END IF;

  -- Verificar estoque
  IF v_reward_record.stock IS NOT NULL AND v_reward_record.stock <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Recompensa fora de estoque'
    );
  END IF;

  -- Buscar pontos do usuário
  SELECT total_points INTO v_user_points
  FROM user_points
  WHERE user_id = v_user_id;

  IF v_user_points IS NULL THEN
    v_user_points := 0;
  END IF;

  -- Verificar se tem pontos suficientes
  IF v_user_points < v_reward_record.points_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pontos insuficientes para resgatar esta recompensa'
    );
  END IF;

  -- Verificar se já resgatou esta recompensa
  IF EXISTS (
    SELECT 1 FROM reward_redemptions
    WHERE user_id = v_user_id 
      AND reward_id = _reward_id 
      AND status IN ('pending', 'approved')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Você já resgatou esta recompensa'
    );
  END IF;

  -- Criar o resgate
  INSERT INTO reward_redemptions (
    user_id,
    reward_id,
    status,
    points_spent
  ) VALUES (
    v_user_id,
    _reward_id,
    'pending',
    v_reward_record.points_cost
  ) RETURNING id INTO v_redemption_id;

  -- Debitar pontos do usuário
  UPDATE user_points
  SET total_points = total_points - v_reward_record.points_cost,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Decrementar estoque se aplicável
  IF v_reward_record.stock IS NOT NULL THEN
    UPDATE rewards_items
    SET stock = stock - 1,
        updated_at = NOW()
    WHERE id = _reward_id;
  END IF;

  -- Registrar atividade de gamificação
  INSERT INTO gamification_activities (
    user_id,
    activity_type,
    points_earned,
    description,
    metadata
  ) VALUES (
    v_user_id,
    'reward_redeemed',
    -v_reward_record.points_cost,
    'Resgatou: ' || v_reward_record.title,
    jsonb_build_object(
      'reward_id', _reward_id,
      'redemption_id', v_redemption_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recompensa resgatada com sucesso',
    'reward_title', v_reward_record.title,
    'points_cost', v_reward_record.points_cost,
    'redemption_id', v_redemption_id
  );
END;
$$;