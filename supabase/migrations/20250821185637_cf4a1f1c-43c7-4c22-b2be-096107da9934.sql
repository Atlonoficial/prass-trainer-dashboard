-- Update triggers to handle only detail_view and redirect_click interactions
DROP TRIGGER IF EXISTS trigger_auto_aggregate_banner_metrics ON public.banner_interactions;
DROP TRIGGER IF EXISTS trigger_realtime_banner_metrics ON public.banner_interactions;

-- Update the aggregation function to handle the new interaction types
CREATE OR REPLACE FUNCTION public.aggregate_banner_metrics_simple(p_banner_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_detail_views INT := 0;
  total_redirect_clicks INT := 0;
  unique_users INT := 0;
  ctr_value NUMERIC := 0;
BEGIN
  -- Count metrics for the banner on the specific date
  SELECT 
    COUNT(*) FILTER (WHERE interaction_type = 'detail_view'),
    COUNT(*) FILTER (WHERE interaction_type = 'redirect_click'),
    COUNT(DISTINCT user_id)
  INTO total_detail_views, total_redirect_clicks, unique_users
  FROM public.banner_interactions 
  WHERE banner_id = p_banner_id 
    AND DATE(created_at) = p_date;

  -- Calculate CTR (redirect_clicks / detail_views * 100)
  IF total_detail_views > 0 THEN
    ctr_value := ROUND((total_redirect_clicks::numeric / total_detail_views) * 100, 2);
  ELSE
    ctr_value := 0;
  END IF;

  -- Insert or update analytics record
  INSERT INTO public.banner_analytics (
    banner_id, 
    user_id, 
    date, 
    impressions, 
    clicks, 
    conversions,
    metadata
  ) VALUES (
    p_banner_id, 
    (SELECT created_by FROM banners WHERE id = p_banner_id LIMIT 1), 
    p_date, 
    total_detail_views,  -- Using detail_views as "impressions" 
    total_redirect_clicks,  -- Using redirect_clicks as "clicks"
    0,  -- No conversions in simplified model
    jsonb_build_object(
      'detail_views', total_detail_views,
      'redirect_clicks', total_redirect_clicks,
      'unique_users', unique_users,
      'ctr', ctr_value
    )
  )
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$function$;

-- Create trigger function for real-time aggregation
CREATE OR REPLACE FUNCTION public.trigger_aggregate_simple_banner_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Aggregate metrics for the banner interaction date
  PERFORM public.aggregate_banner_metrics_simple(NEW.banner_id, DATE(NEW.created_at));
  RETURN NEW;
END;
$function$;

-- Create trigger for real-time updates
CREATE TRIGGER trigger_simple_banner_metrics
  AFTER INSERT ON public.banner_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_aggregate_simple_banner_metrics();