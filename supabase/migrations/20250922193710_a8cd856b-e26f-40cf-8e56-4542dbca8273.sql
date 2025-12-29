-- Atualizar a função accept_invitation para aplicar permissões de conteúdo
-- quando o convite for aceito

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_code text, user_id_param uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  student_record RECORD;
  final_user_id uuid;
  permission_item text;
BEGIN
  -- Use provided user_id or auth.uid()
  final_user_id := COALESCE(user_id_param, auth.uid());
  
  IF final_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Find the invitation
  SELECT * INTO invitation_record
  FROM student_invitations
  WHERE code = invitation_code
    AND status = 'pending'
    AND expires_at > NOW();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  -- Check if student already exists for this teacher
  SELECT * INTO student_record
  FROM students
  WHERE user_id = final_user_id 
    AND teacher_id = invitation_record.teacher_id;
    
  IF FOUND THEN
    RAISE EXCEPTION 'Student is already linked to this teacher';
  END IF;

  -- Create student record
  INSERT INTO students (
    user_id,
    teacher_id,
    active_plan,
    mode,
    membership_status,
    goals,
    membership_expiry
  ) VALUES (
    final_user_id,
    invitation_record.teacher_id,
    invitation_record.plan_id,
    invitation_record.mode,
    CASE 
      WHEN invitation_record.plan_id IS NOT NULL AND invitation_record.plan_id != '' 
      THEN 'active' 
      ELSE 'inactive' 
    END,
    CASE 
      WHEN invitation_record.goal IS NOT NULL 
      THEN ARRAY[invitation_record.goal] 
      ELSE NULL 
    END,
    CASE 
      WHEN invitation_record.plan_id IS NOT NULL AND invitation_record.plan_id != '' 
      THEN NOW() + INTERVAL '30 days'
      ELSE NULL 
    END
  );

  -- Apply content permissions if they exist
  IF invitation_record.selected_contents IS NOT NULL THEN
    -- Insert content permissions based on selected_contents
    FOR permission_item IN SELECT jsonb_object_keys(invitation_record.selected_contents) LOOP
      IF (invitation_record.selected_contents->>permission_item)::boolean = true THEN
        INSERT INTO student_content_permissions (
          student_id,
          teacher_id,
          content_id,
          granted_at
        ) VALUES (
          final_user_id,
          invitation_record.teacher_id,
          CASE permission_item
            WHEN 'trainingPlans' THEN 'training_plans'
            WHEN 'dietPlans' THEN 'diet_plans'
            WHEN 'nutritionLibrary' THEN 'nutrition_library'
            WHEN 'exerciseLibrary' THEN 'exercise_library'
            WHEN 'consultations' THEN 'consultations'
            WHEN 'reports' THEN 'reports'
            WHEN 'courses' THEN 'courses'
            ELSE permission_item
          END,
          NOW()
        );
      END IF;
    END LOOP;
  END IF;

  -- Mark invitation as accepted
  UPDATE student_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = final_user_id
  WHERE code = invitation_code;

  RETURN 'Invitation accepted successfully';
END;
$$;