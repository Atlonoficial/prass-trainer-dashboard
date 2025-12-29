-- Corrigir função aggregate_daily_banner_metrics removendo metadata
CREATE OR REPLACE FUNCTION public.aggregate_daily_banner_metrics(target_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  processed_records int := 0;
  result json;
BEGIN
  -- Limpar dados existentes para o dia específico
  DELETE FROM public.banner_analytics 
  WHERE date = target_date;
  
  -- Inserir métricas agregadas sem a coluna metadata
  INSERT INTO public.banner_analytics (
    banner_id, 
    user_id, 
    date, 
    impressions, 
    clicks, 
    conversions
  )
  SELECT 
    bi.banner_id,
    bi.user_id,
    target_date,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'view') as impressions,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'click') as clicks,
    COUNT(*) FILTER (WHERE bi.interaction_type = 'conversion') as conversions
  FROM public.banner_interactions bi
  WHERE DATE(bi.created_at) = target_date
  GROUP BY bi.banner_id, bi.user_id;
  
  GET DIAGNOSTICS processed_records = ROW_COUNT;
  
  result := json_build_object(
    'success', true,
    'date', target_date,
    'processed_records', processed_records,
    'message', 'Métricas agregadas com sucesso'
  );
  
  RETURN result;
END;
$function$;

-- Corrigir função aggregate_banner_metrics_realtime removendo metadata
CREATE OR REPLACE FUNCTION public.aggregate_banner_metrics_realtime(p_banner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Upsert na tabela de analytics sem metadata
  INSERT INTO public.banner_analytics (banner_id, user_id, date, impressions, clicks, conversions)
  VALUES (p_banner_id, auth.uid(), today_date, total_impressions, total_clicks, total_conversions)
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    updated_at = now();
END;
$function$;