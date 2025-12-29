-- Create function to manage reward redemptions
CREATE OR REPLACE FUNCTION public.update_redemption_status(
  _redemption_id uuid,
  _new_status text,
  _admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  redemption_data record;
  student_user_id uuid;
  points_to_refund integer;
  result json;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get redemption details with student info
  SELECT 
    rr.*,
    ri.title as reward_title,
    s.teacher_id,
    s.user_id as student_user_id
  INTO redemption_data
  FROM reward_redemptions rr
  JOIN rewards_items ri ON ri.id = rr.reward_id
  JOIN students s ON s.user_id = rr.user_id
  WHERE rr.id = _redemption_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Redemption not found';
  END IF;

  -- Check if user is the teacher of this student
  IF redemption_data.teacher_id != uid THEN
    RAISE EXCEPTION 'Not authorized to manage this redemption';
  END IF;

  -- Update redemption status
  UPDATE reward_redemptions 
  SET 
    status = _new_status,
    admin_notes = _admin_notes,
    updated_at = now()
  WHERE id = _redemption_id;

  -- If rejecting, refund points to student
  IF _new_status = 'rejected' AND redemption_data.status != 'rejected' THEN
    UPDATE user_points 
    SET 
      total_points = total_points + redemption_data.points_spent,
      updated_at = now()
    WHERE user_id = redemption_data.user_id;
    
    -- Log activity
    INSERT INTO gamification_activities (
      user_id, activity_type, points_earned, description, metadata
    ) VALUES (
      redemption_data.user_id, 
      'points_refunded', 
      redemption_data.points_spent,
      'Pontos devolvidos - resgate rejeitado: ' || redemption_data.reward_title,
      jsonb_build_object('redemption_id', _redemption_id, 'reward_title', redemption_data.reward_title)
    );
  END IF;

  -- Create notification for student
  INSERT INTO notifications (
    title,
    message,
    target_users,
    type,
    data
  ) VALUES (
    CASE 
      WHEN _new_status = 'approved' THEN 'Resgate Aprovado!'
      WHEN _new_status = 'rejected' THEN 'Resgate Rejeitado'
      ELSE 'Status do Resgate Atualizado'
    END,
    CASE 
      WHEN _new_status = 'approved' THEN 'Seu resgate de "' || redemption_data.reward_title || '" foi aprovado!'
      WHEN _new_status = 'rejected' THEN 'Seu resgate de "' || redemption_data.reward_title || '" foi rejeitado. Os pontos foram devolvidos.'
      ELSE 'O status do seu resgate foi atualizado para: ' || _new_status
    END,
    ARRAY[redemption_data.user_id],
    'reward_redemption',
    jsonb_build_object(
      'redemption_id', _redemption_id,
      'reward_title', redemption_data.reward_title,
      'status', _new_status,
      'admin_notes', _admin_notes
    )
  );

  result := json_build_object(
    'success', true,
    'redemption_id', _redemption_id,
    'new_status', _new_status,
    'student_notified', true
  );

  RETURN result;
END;
$$;