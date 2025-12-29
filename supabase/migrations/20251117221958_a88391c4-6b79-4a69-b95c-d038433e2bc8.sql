-- ============================================
-- FASE 2: Criar Tabela de Campanhas
-- ============================================

-- Criar tabela notification_campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  target_user_ids TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'sent',
  scheduled_for TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  onesignal_notification_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaigns_teacher ON public.notification_campaigns(teacher_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.notification_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent ON public.notification_campaigns(sent_at DESC);

-- RLS Policies
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their campaigns"
  ON public.notification_campaigns FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create campaigns"
  ON public.notification_campaigns FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their campaigns"
  ON public.notification_campaigns FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_notification_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_campaigns_updated_at
  BEFORE UPDATE ON public.notification_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_campaigns_updated_at();

-- ============================================
-- FASE 5: Criar Tabela de Interações
-- ============================================

-- Criar tabela notification_interactions
CREATE TABLE IF NOT EXISTS public.notification_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  user_id UUID,
  player_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interactions_campaign ON public.notification_interactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON public.notification_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_action ON public.notification_interactions(action);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON public.notification_interactions(created_at DESC);

-- RLS Policies
ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions for their campaigns"
  ON public.notification_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notification_campaigns
      WHERE notification_campaigns.id = notification_interactions.campaign_id
      AND notification_campaigns.teacher_id = auth.uid()
    )
  );

CREATE POLICY "System can insert interactions"
  ON public.notification_interactions FOR INSERT
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.notification_campaigns IS 'Armazena campanhas de notificações push enviadas';
COMMENT ON TABLE public.notification_interactions IS 'Rastreia interações dos usuários com notificações (entregue, aberto, clicado)';