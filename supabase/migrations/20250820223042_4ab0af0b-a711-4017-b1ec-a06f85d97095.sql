-- Create banner analytics tables for tracking metrics

-- Table for aggregated banner analytics
CREATE TABLE public.banner_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(banner_id, user_id, date)
);

-- Table for individual banner interactions/events
CREATE TABLE public.banner_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'conversion')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT
);

-- Enable RLS
ALTER TABLE public.banner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for banner_analytics
CREATE POLICY "Teachers can view student banner analytics" 
ON public.banner_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.banners b 
    WHERE b.id = banner_analytics.banner_id 
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "System can manage banner analytics" 
ON public.banner_analytics 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own banner analytics" 
ON public.banner_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS Policies for banner_interactions
CREATE POLICY "Teachers can view student banner interactions" 
ON public.banner_interactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.banners b 
    WHERE b.id = banner_interactions.banner_id 
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY "System can manage banner interactions" 
ON public.banner_interactions 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can create own banner interactions" 
ON public.banner_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own banner interactions" 
ON public.banner_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_banner_analytics_banner_date ON public.banner_analytics(banner_id, date);
CREATE INDEX idx_banner_analytics_user_date ON public.banner_analytics(user_id, date);
CREATE INDEX idx_banner_interactions_banner_created ON public.banner_interactions(banner_id, created_at);
CREATE INDEX idx_banner_interactions_user_created ON public.banner_interactions(user_id, created_at);

-- Function to aggregate banner interactions into analytics
CREATE OR REPLACE FUNCTION public.aggregate_banner_interactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert or update daily aggregations
  INSERT INTO public.banner_analytics (banner_id, user_id, date, impressions, clicks, conversions)
  SELECT 
    banner_id,
    user_id,
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE interaction_type = 'view') as impressions,
    COUNT(*) FILTER (WHERE interaction_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE interaction_type = 'conversion') as conversions
  FROM public.banner_interactions
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY banner_id, user_id, DATE(created_at)
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    updated_at = now();
END;
$$;

-- Trigger to update analytics on new interactions
CREATE OR REPLACE FUNCTION public.trigger_aggregate_banner_analytics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Aggregate for the specific date
  INSERT INTO public.banner_analytics (banner_id, user_id, date, impressions, clicks, conversions)
  SELECT 
    NEW.banner_id,
    NEW.user_id,
    DATE(NEW.created_at),
    COUNT(*) FILTER (WHERE interaction_type = 'view'),
    COUNT(*) FILTER (WHERE interaction_type = 'click'),
    COUNT(*) FILTER (WHERE interaction_type = 'conversion')
  FROM public.banner_interactions
  WHERE banner_id = NEW.banner_id 
    AND user_id = NEW.user_id 
    AND DATE(created_at) = DATE(NEW.created_at)
  GROUP BY banner_id, user_id, DATE(created_at)
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_banner_analytics_aggregation
  AFTER INSERT ON public.banner_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_aggregate_banner_analytics();