-- Fix security warnings: Set search_path for functions

-- Fix search path for grant_access_after_payment function
CREATE OR REPLACE FUNCTION public.grant_access_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when order status changes to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Grant access to products
    INSERT INTO public.user_purchases (user_id, product_id, order_id, purchase_type)
    SELECT 
      NEW.user_id,
      oi.product_id,
      NEW.id,
      oi.item_type
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id 
      AND oi.product_id IS NOT NULL
    ON CONFLICT (user_id, product_id) DO NOTHING;
    
    -- Grant access to courses  
    INSERT INTO public.user_purchases (user_id, course_id, order_id, purchase_type)
    SELECT 
      NEW.user_id,
      oi.course_id,
      NEW.id,
      oi.item_type
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id 
      AND oi.course_id IS NOT NULL
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add the missing course totals update function with proper search path
CREATE OR REPLACE FUNCTION public.update_course_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course_id UUID;
  _total_lessons INTEGER;
  _total_duration INTEGER;
BEGIN
  -- Get course_id based on the table being updated
  IF TG_TABLE_NAME = 'course_modules' THEN
    _course_id := COALESCE(NEW.course_id, OLD.course_id);
  ELSIF TG_TABLE_NAME = 'course_lessons' THEN
    SELECT course_id INTO _course_id 
    FROM public.course_modules 
    WHERE id = COALESCE(NEW.module_id, OLD.module_id);
  END IF;
  
  -- Calculate totals
  SELECT 
    COUNT(cl.id),
    COALESCE(SUM(cl.video_duration_minutes), 0)
  INTO _total_lessons, _total_duration
  FROM public.course_modules cm
  JOIN public.course_lessons cl ON cl.module_id = cm.id
  WHERE cm.course_id = _course_id
    AND cm.is_published = true 
    AND cl.is_published = true;
  
  -- Update course
  UPDATE public.courses 
  SET 
    total_lessons = _total_lessons,
    total_duration_minutes = _total_duration,
    updated_at = now()
  WHERE id = _course_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for course totals
DROP TRIGGER IF EXISTS trigger_update_course_totals_modules ON public.course_modules;
DROP TRIGGER IF EXISTS trigger_update_course_totals_lessons ON public.course_lessons;

CREATE TRIGGER trigger_update_course_totals_modules
  AFTER INSERT OR UPDATE OR DELETE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_totals();

CREATE TRIGGER trigger_update_course_totals_lessons
  AFTER INSERT OR UPDATE OR DELETE ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_totals();

-- Enable real-time for all new tables
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.course_modules REPLICA IDENTITY FULL;
ALTER TABLE public.course_lessons REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.user_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.lesson_progress REPLICA IDENTITY FULL;

-- Add tables to real-time publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_purchases;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;