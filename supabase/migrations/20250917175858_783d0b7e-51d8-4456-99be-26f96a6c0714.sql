-- Enable realtime for nutrition_plans table
ALTER TABLE public.nutrition_plans REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.nutrition_plans;

-- Create trigger function to notify plan changes
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
      -- Send push notification to student
      PERFORM 
        net.http_post(
          url := 'https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/onesignal-notifications',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'token'
          ),
          body := jsonb_build_object(
            'user_ids', jsonb_build_array(student_user_id),
            'title', CASE 
              WHEN TG_OP = 'INSERT' THEN 'Novo Plano Nutricional!'
              WHEN TG_OP = 'UPDATE' THEN 'Plano Nutricional Atualizado!'
              WHEN TG_OP = 'DELETE' THEN 'Plano Nutricional Removido'
            END,
            'message', CASE 
              WHEN TG_OP = 'INSERT' THEN 'Você recebeu um novo plano alimentar: ' || (notification_data->>'name')
              WHEN TG_OP = 'UPDATE' THEN 'Seu plano alimentar foi atualizado: ' || (notification_data->>'name')
              WHEN TG_OP = 'DELETE' THEN 'Um plano alimentar foi removido pelo seu professor'
            END,
            'data', jsonb_build_object(
              'type', 'nutrition_plan',
              'action', lower(TG_OP),
              'plan_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
              'plan_name', CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END
            )
          )
        );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for nutrition plans
DROP TRIGGER IF EXISTS nutrition_plan_changes_trigger ON public.nutrition_plans;
CREATE TRIGGER nutrition_plan_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION notify_nutrition_plan_changes();

-- Enable realtime for workouts table (training plans)
ALTER TABLE public.workouts REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.workouts;

-- Create trigger function to notify workout changes
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
      -- Send push notification to student
      PERFORM 
        net.http_post(
          url := 'https://bqbopkqzkavhmenjlhab.supabase.co/functions/v1/onesignal-notifications',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'token'
          ),
          body := jsonb_build_object(
            'user_ids', jsonb_build_array(student_user_id),
            'title', CASE 
              WHEN TG_OP = 'INSERT' THEN 'Novo Plano de Treino!'
              WHEN TG_OP = 'UPDATE' THEN 'Plano de Treino Atualizado!'
              WHEN TG_OP = 'DELETE' THEN 'Plano de Treino Removido'
            END,
            'message', CASE 
              WHEN TG_OP = 'INSERT' THEN 'Você recebeu um novo plano de treino: ' || (notification_data->>'name')
              WHEN TG_OP = 'UPDATE' THEN 'Seu plano de treino foi atualizado: ' || (notification_data->>'name')
              WHEN TG_OP = 'DELETE' THEN 'Um plano de treino foi removido pelo seu professor'
            END,
            'data', jsonb_build_object(
              'type', 'training_plan',
              'action', lower(TG_OP),
              'plan_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
              'plan_name', CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END
            )
          )
        );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for workouts
DROP TRIGGER IF EXISTS workout_changes_trigger ON public.workouts;
CREATE TRIGGER workout_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION notify_workout_changes();

-- Add sync status columns for tracking
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending';
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending';
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;