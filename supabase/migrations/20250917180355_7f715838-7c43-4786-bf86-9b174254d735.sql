-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION notify_nutrition_plan_changes()
RETURNS TRIGGER AS $$
DECLARE
  notification_data jsonb;
  student_user_id uuid;
BEGIN
  -- Get the operation type
  IF TG_OP = 'INSERT' THEN
    notification_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    notification_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    notification_data := to_jsonb(OLD);
  END IF;

  -- Loop through assigned students and send notifications
  IF notification_data ? 'assigned_to' THEN
    FOR student_user_id IN 
      SELECT unnest((notification_data->>'assigned_to')::uuid[])
    LOOP
      -- Send push notification to student (simplified for now)
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        data,
        created_by
      ) VALUES (
        student_user_id,
        CASE 
          WHEN TG_OP = 'INSERT' THEN 'Novo Plano Nutricional!'
          WHEN TG_OP = 'UPDATE' THEN 'Plano Nutricional Atualizado!'
          WHEN TG_OP = 'DELETE' THEN 'Plano Nutricional Removido'
        END,
        CASE 
          WHEN TG_OP = 'INSERT' THEN 'Você recebeu um novo plano alimentar: ' || (notification_data->>'name')
          WHEN TG_OP = 'UPDATE' THEN 'Seu plano alimentar foi atualizado: ' || (notification_data->>'name')
          WHEN TG_OP = 'DELETE' THEN 'Um plano alimentar foi removido pelo seu professor'
        END,
        jsonb_build_object(
          'type', 'nutrition_plan',
          'action', lower(TG_OP),
          'plan_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
          'plan_name', CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END
        ),
        CASE WHEN TG_OP = 'DELETE' THEN OLD.created_by ELSE NEW.created_by END
      );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path for workout changes function
CREATE OR REPLACE FUNCTION notify_workout_changes()
RETURNS TRIGGER AS $$
DECLARE
  notification_data jsonb;
  student_user_id uuid;
BEGIN
  -- Get the operation type
  IF TG_OP = 'INSERT' THEN
    notification_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    notification_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    notification_data := to_jsonb(OLD);
  END IF;

  -- Loop through assigned students and send notifications
  IF notification_data ? 'assigned_to' THEN
    FOR student_user_id IN 
      SELECT unnest((notification_data->>'assigned_to')::uuid[])
    LOOP
      -- Send push notification to student (simplified for now)
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        data,
        created_by
      ) VALUES (
        student_user_id,
        CASE 
          WHEN TG_OP = 'INSERT' THEN 'Novo Plano de Treino!'
          WHEN TG_OP = 'UPDATE' THEN 'Plano de Treino Atualizado!'
          WHEN TG_OP = 'DELETE' THEN 'Plano de Treino Removido'
        END,
        CASE 
          WHEN TG_OP = 'INSERT' THEN 'Você recebeu um novo plano de treino: ' || (notification_data->>'name')
          WHEN TG_OP = 'UPDATE' THEN 'Seu plano de treino foi atualizado: ' || (notification_data->>'name')
          WHEN TG_OP = 'DELETE' THEN 'Um plano de treino foi removido pelo seu professor'
        END,
        jsonb_build_object(
          'type', 'training_plan',
          'action', lower(TG_OP),
          'plan_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
          'plan_name', CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END
        ),
        CASE WHEN TG_OP = 'DELETE' THEN OLD.created_by ELSE NEW.created_by END
      );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;