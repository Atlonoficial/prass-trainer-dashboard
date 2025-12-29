-- FASE 2: FUNÇÃO PARA SINCRONIZAÇÃO AUTOMÁTICA DE NOTIFICAÇÕES

-- Criar função para sincronizar notificações
CREATE OR REPLACE FUNCTION public.sync_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Quando user_settings é atualizado, sincroniza com profiles
  UPDATE profiles 
  SET notification_preferences = jsonb_build_object(
    'email', NEW.email_notifications,
    'sms', NEW.sms_notifications,
    'push', NEW.push_notifications,
    'marketing', NEW.marketing_notifications,
    'achievements', COALESCE((notification_preferences->>'achievements')::boolean, true),
    'schedule_updates', COALESCE((notification_preferences->>'schedule_updates')::boolean, true),
    'teacher_messages', COALESCE((notification_preferences->>'teacher_messages')::boolean, true),
    'workout_reminders', COALESCE((notification_preferences->>'workout_reminders')::boolean, true)
  ),
  updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronização
DROP TRIGGER IF EXISTS sync_user_settings_to_profiles ON user_settings;
CREATE TRIGGER sync_user_settings_to_profiles
  AFTER INSERT OR UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_notification_preferences();