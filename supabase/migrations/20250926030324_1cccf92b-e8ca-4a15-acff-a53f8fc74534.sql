-- FASE 1: INFRAESTRUTURA COMPLETA PARA MARKETING AVANÇADO

-- Tabela para campanhas de automação
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  campaign_type TEXT NOT NULL DEFAULT 'automated' CHECK (campaign_type IN ('automated', 'scheduled', 'triggered')),
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  banner_template JSONB NOT NULL,
  target_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_config JSONB,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_execution TIMESTAMP WITH TIME ZONE,
  performance_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para segmentação inteligente de usuários
CREATE TABLE public.marketing_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('behavioral', 'demographic', 'engagement', 'custom')),
  criteria JSONB NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 0,
  last_calculated TIMESTAMP WITH TIME ZONE,
  is_dynamic BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para testes A/B
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  traffic_split NUMERIC NOT NULL DEFAULT 50.0 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  success_metric TEXT NOT NULL DEFAULT 'ctr',
  confidence_level NUMERIC NOT NULL DEFAULT 95.0,
  sample_size INTEGER,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  results JSONB,
  winner_variant TEXT CHECK (winner_variant IN ('a', 'b', 'inconclusive')),
  statistical_significance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para insights e analytics em cache
CREATE TABLE public.marketing_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('recommendation', 'trend', 'anomaly', 'optimization')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  data JSONB NOT NULL,
  actions JSONB,
  is_actionable BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expandir tabela banner_interactions com mais dados contextuais
ALTER TABLE public.banner_interactions 
ADD COLUMN IF NOT EXISTS placement TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS conversion_value NUMERIC,
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS time_on_page INTEGER;

-- Expandir tabela banners para A/B testing
ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS ab_test_id UUID,
ADD COLUMN IF NOT EXISTS variant_type TEXT CHECK (variant_type IN ('control', 'variant_a', 'variant_b')),
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_optimization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_banner_interactions_created_at ON public.banner_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_banner_interactions_banner_user ON public.banner_interactions(banner_id, user_id);
CREATE INDEX IF NOT EXISTS idx_banner_interactions_type ON public.banner_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);

-- Função para calcular segmentos automaticamente
CREATE OR REPLACE FUNCTION public.calculate_user_segment_membership(
  p_segment_id UUID,
  p_criteria JSONB
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER := 0;
  criteria_type TEXT;
  criteria_value JSONB;
BEGIN
  criteria_type := p_criteria->>'type';
  criteria_value := p_criteria->'value';
  
  CASE criteria_type
    WHEN 'engagement_high' THEN
      SELECT COUNT(DISTINCT user_id) INTO user_count
      FROM banner_interactions 
      WHERE created_at >= now() - interval '30 days'
      GROUP BY user_id
      HAVING COUNT(*) >= 10;
      
    WHEN 'engagement_low' THEN
      SELECT COUNT(DISTINCT user_id) INTO user_count
      FROM banner_interactions 
      WHERE created_at >= now() - interval '30 days'
      GROUP BY user_id
      HAVING COUNT(*) <= 2;
      
    WHEN 'recent_signup' THEN
      SELECT COUNT(*) INTO user_count
      FROM profiles
      WHERE created_at >= now() - interval '7 days';
      
    WHEN 'inactive_users' THEN
      SELECT COUNT(*) INTO user_count
      FROM profiles p
      WHERE NOT EXISTS (
        SELECT 1 FROM banner_interactions bi
        WHERE bi.user_id = p.id 
          AND bi.created_at >= now() - interval '14 days'
      );
      
    ELSE
      user_count := 0;
  END CASE;
  
  RETURN user_count;
END;
$$;

-- Função para executar campanhas automatizadas
CREATE OR REPLACE FUNCTION public.execute_marketing_campaign(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign_record RECORD;
  banner_data JSONB;
  target_users UUID[];
  new_banner_id UUID;
  execution_result JSONB;
BEGIN
  -- Buscar campanha
  SELECT * INTO campaign_record
  FROM marketing_campaigns
  WHERE id = p_campaign_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found or inactive');
  END IF;
  
  -- Criar banner baseado no template
  banner_data := campaign_record.banner_template;
  
  INSERT INTO banners (
    created_by,
    title,
    message,
    type,
    action_text,
    action_url,
    image_url,
    is_active,
    start_date,
    end_date
  )
  VALUES (
    campaign_record.created_by,
    banner_data->>'title',
    banner_data->>'message',
    banner_data->>'type',
    banner_data->>'action_text',
    banner_data->>'action_url',
    banner_data->>'image_url',
    true,
    now(),
    CASE 
      WHEN campaign_record.end_date IS NOT NULL 
      THEN campaign_record.end_date 
      ELSE now() + interval '7 days' 
    END
  )
  RETURNING id INTO new_banner_id;
  
  -- Atualizar contadores da campanha
  UPDATE marketing_campaigns
  SET 
    execution_count = execution_count + 1,
    last_execution = now(),
    updated_at = now()
  WHERE id = p_campaign_id;
  
  execution_result := jsonb_build_object(
    'success', true,
    'banner_id', new_banner_id,
    'campaign_id', p_campaign_id,
    'executed_at', now()
  );
  
  RETURN execution_result;
END;
$$;

-- RLS Policies
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;

-- Policies para marketing_campaigns
CREATE POLICY "Teachers can manage own campaigns"
ON public.marketing_campaigns FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policies para marketing_segments
CREATE POLICY "Teachers can manage own segments"
ON public.marketing_segments FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policies para ab_tests
CREATE POLICY "Teachers can manage own ab tests"
ON public.ab_tests FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policies para marketing_insights
CREATE POLICY "Teachers can view own insights"
ON public.marketing_insights FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "System can create insights"
ON public.marketing_insights FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_segments_updated_at
BEFORE UPDATE ON public.marketing_segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
BEFORE UPDATE ON public.ab_tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();