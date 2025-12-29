-- FASE 1: LIMPEZA E UNIFICAÇÃO DE DADOS

-- 1. Migrar dados do whatsapp_number para whatsapp_url (se necessário)
UPDATE profiles 
SET whatsapp_url = CASE 
  WHEN whatsapp_number IS NOT NULL AND whatsapp_url IS NULL 
  THEN CONCAT('https://wa.me/', REGEXP_REPLACE(whatsapp_number, '[^0-9]', '', 'g'))
  ELSE whatsapp_url 
END
WHERE whatsapp_number IS NOT NULL AND whatsapp_url IS NULL;

-- 2. Remover coluna duplicada whatsapp_number
ALTER TABLE profiles DROP COLUMN IF EXISTS whatsapp_number;

-- 3. Adicionar campos que estão sendo usados na interface mas não existem
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gym_name text,
ADD COLUMN IF NOT EXISTS gym_cnpj text,
ADD COLUMN IF NOT EXISTS gym_address text;

-- 4. Migrar notificações de user_settings para profiles (unificar)
UPDATE profiles p
SET notification_preferences = COALESCE(
  p.notification_preferences,
  jsonb_build_object(
    'email', COALESCE(us.email_notifications, true),
    'sms', COALESCE(us.sms_notifications, false), 
    'push', COALESCE(us.push_notifications, true),
    'marketing', COALESCE(us.marketing_notifications, false),
    'achievements', true,
    'schedule_updates', true,
    'teacher_messages', true,
    'workout_reminders', true
  )
)
FROM user_settings us 
WHERE p.id = us.user_id;

-- 5. Limpar tabela user_settings duplicada (será mantida para compatibilidade)
-- Mas sincronizar com profiles sempre que necessário