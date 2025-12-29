-- ===================================================
-- TABELAS DE NOTIFICAÇÕES - VERSÃO CORRIGIDA
-- Execute no SQL Editor do Supabase
-- ===================================================

-- PARTE 1: notification_campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  target_user_ids TEXT[],
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  onesignal_notification_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nc_teacher_all" ON public.notification_campaigns;
CREATE POLICY "nc_teacher_all" ON public.notification_campaigns FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- PARTE 2: notification_templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nt_teacher_all" ON public.notification_templates;
CREATE POLICY "nt_teacher_all" ON public.notification_templates FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- PARTE 3: notification_automation_rules
CREATE TABLE IF NOT EXISTS public.notification_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  condition JSONB,
  template_id UUID,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nar_teacher_all" ON public.notification_automation_rules;
CREATE POLICY "nar_teacher_all" ON public.notification_automation_rules FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- PARTE 4: notification_interactions
CREATE TABLE IF NOT EXISTS public.notification_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID,
  user_id UUID,
  player_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ni_select" ON public.notification_interactions;
DROP POLICY IF EXISTS "ni_insert" ON public.notification_interactions;
CREATE POLICY "ni_select" ON public.notification_interactions FOR SELECT USING (true);
CREATE POLICY "ni_insert" ON public.notification_interactions FOR INSERT WITH CHECK (true);

-- PARTE 5: notifications (principal)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  created_by UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  deep_link TEXT,
  image_url TEXT,
  action_url TEXT,
  action_text TEXT,
  action_required BOOLEAN DEFAULT false,
  data JSONB,
  target_users TEXT[],
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "n_select" ON public.notifications;
DROP POLICY IF EXISTS "n_insert" ON public.notifications;
DROP POLICY IF EXISTS "n_update" ON public.notifications;
CREATE POLICY "n_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "n_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "n_update" ON public.notifications FOR UPDATE USING (true);

-- PARTE 6: notification_logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID,
  user_id UUID,
  onesignal_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nl_all" ON public.notification_logs;
CREATE POLICY "nl_all" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);

-- Verificar as tabelas criadas (sem user_id)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'notification%'
ORDER BY table_name;
