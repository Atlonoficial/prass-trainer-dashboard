-- Criar função para agregar métricas de banner em tempo real
CREATE OR REPLACE FUNCTION public.aggregate_banner_metrics_realtime(p_banner_id UUID)
RETURNS VOID AS $$
DECLARE
  total_impressions INT := 0;
  total_clicks INT := 0;
  total_conversions INT := 0;
  unique_users INT := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Contar métricas do banner para hoje
  SELECT 
    COUNT(*) FILTER (WHERE interaction_type = 'view'),
    COUNT(*) FILTER (WHERE interaction_type = 'click'),
    COUNT(*) FILTER (WHERE interaction_type = 'conversion'),
    COUNT(DISTINCT user_id)
  INTO total_impressions, total_clicks, total_conversions, unique_users
  FROM public.banner_interactions 
  WHERE banner_id = p_banner_id 
    AND DATE(created_at) = today_date;

  -- Upsert na tabela de analytics
  INSERT INTO public.banner_analytics (banner_id, user_id, date, impressions, clicks, conversions)
  VALUES (p_banner_id, auth.uid(), today_date, total_impressions, total_clicks, total_conversions)
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para agregação automática
CREATE OR REPLACE FUNCTION public.trigger_auto_aggregate_banner_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Chamar função de agregação quando houver nova interação
  PERFORM public.aggregate_banner_metrics_realtime(NEW.banner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela banner_interactions
DROP TRIGGER IF EXISTS auto_aggregate_banner_metrics ON public.banner_interactions;
CREATE TRIGGER auto_aggregate_banner_metrics
  AFTER INSERT ON public.banner_interactions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_aggregate_banner_metrics();

-- Função para calcular métricas de banner sem agregação (fallback)
CREATE OR REPLACE FUNCTION public.get_banner_metrics_direct(p_banner_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE(
  banner_id UUID,
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_conversions BIGINT,
  unique_users BIGINT,
  ctr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_banner_id,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'view') as total_impressions,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'click') as total_clicks,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'conversion') as total_conversions,
    COUNT(DISTINCT bi.user_id) as unique_users,
    CASE 
      WHEN COUNT(*) FILTER (WHERE bi.interaction_type = 'view') > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE bi.interaction_type = 'click')::numeric / COUNT(*) FILTER (WHERE bi.interaction_type = 'view')) * 100, 2)
      ELSE 0 
    END as ctr
  FROM public.banner_interactions bi
  WHERE bi.banner_id = p_banner_id
    AND (p_start_date IS NULL OR DATE(bi.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(bi.created_at) <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;