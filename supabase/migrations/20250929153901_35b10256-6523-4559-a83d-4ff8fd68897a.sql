-- COMPREHENSIVE SECURITY FIXES - ALL REMAINING FUNCTIONS
-- Address all remaining functions that lack search_path configuration

-- 1. Fix get_teacher_conversations function
CREATE OR REPLACE FUNCTION public.get_teacher_conversations(teacher_id_param uuid)
RETURNS TABLE(conversation_id text, student_id uuid, student_name text, student_email text, last_message text, last_message_at timestamp with time zone, unread_count integer, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.student_id,
    COALESCE(p.name, p.email) as student_name,
    p.email as student_email,
    c.last_message,
    c.last_message_at,
    c.unread_count_teacher as unread_count,
    c.is_active
  FROM conversations c
  JOIN profiles p ON p.id = c.student_id
  WHERE c.teacher_id = teacher_id_param
  AND c.is_active = true
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

-- 2. Fix clear_conversation_messages function
CREATE OR REPLACE FUNCTION public.clear_conversation_messages(p_conversation_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Verificar se o usuário é participante da conversa
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation_id 
    AND (c.teacher_id = uid OR c.student_id = uid)
  ) THEN
    RAISE EXCEPTION 'Não autorizado a limpar esta conversa';
  END IF;

  -- Deletar todas as mensagens da conversa
  DELETE FROM chat_messages 
  WHERE conversation_id = p_conversation_id;
  
  -- Resetar counters e última mensagem
  UPDATE conversations 
  SET 
    last_message = NULL,
    last_message_at = NULL,
    unread_count_teacher = 0,
    unread_count_student = 0,
    updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;

-- 3. Fix clean_old_appointments function
CREATE OR REPLACE FUNCTION public.clean_old_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive appointments older than 6 months
  -- This ensures we keep 3 months of active history plus 3 months buffer
  DELETE FROM appointments 
  WHERE scheduled_time < (now() - interval '6 months')
    AND status IN ('cancelled', 'completed');
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned old appointments older than 6 months';
END;
$$;

-- 4. Fix calculate_student_payment_status function
CREATE OR REPLACE FUNCTION public.calculate_student_payment_status(p_student_id uuid, p_teacher_id uuid)
RETURNS TABLE(student_id uuid, status text, next_payment_date date, overdue_amount numeric, total_pending numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_payment date;
  v_overdue_days integer;
BEGIN
  -- Get last payment date
  SELECT MAX(paid_at::date) INTO v_last_payment
  FROM payment_transactions pt
  WHERE pt.student_id = p_student_id 
    AND pt.teacher_id = p_teacher_id
    AND pt.status = 'paid';
  
  -- Calculate overdue days
  v_overdue_days := COALESCE(CURRENT_DATE - v_last_payment, 999);
  
  RETURN QUERY SELECT 
    p_student_id,
    CASE 
      WHEN v_overdue_days > 30 THEN 'overdue'
      WHEN v_overdue_days > 25 THEN 'due_soon'
      WHEN v_overdue_days <= 5 THEN 'paid'
      ELSE 'inactive'
    END::text,
    COALESCE(v_last_payment + interval '1 month', CURRENT_DATE)::date,
    CASE WHEN v_overdue_days > 30 THEN 100::numeric ELSE 0::numeric END,
    CASE WHEN v_overdue_days > 0 THEN 100::numeric ELSE 0::numeric END;
END;
$$;

-- 5. Fix get_banner_metrics_direct function
CREATE OR REPLACE FUNCTION public.get_banner_metrics_direct(p_banner_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
RETURNS TABLE(banner_id uuid, total_impressions bigint, total_clicks bigint, total_conversions bigint, unique_users bigint, ctr numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM banner_interactions bi
  WHERE bi.banner_id = p_banner_id
    AND (p_start_date IS NULL OR DATE(bi.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(bi.created_at) <= p_end_date);
END;
$$;

-- 6. Fix validate_payment_data_local function
CREATE OR REPLACE FUNCTION public.validate_payment_data_local(p_amount numeric, p_student_id uuid, p_teacher_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid payment amount: %', p_amount;
  END IF;
  
  -- Validate teacher-student relationship
  IF NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = p_student_id 
      AND s.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Invalid teacher-student relationship';
  END IF;
  
  RETURN true;
END;
$$;

-- 7. Fix aggregate_banner_metrics_realtime function
CREATE OR REPLACE FUNCTION public.aggregate_banner_metrics_realtime(p_banner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM banner_interactions 
  WHERE banner_id = p_banner_id 
    AND DATE(created_at) = today_date;

  -- Upsert na tabela de analytics sem metadata
  INSERT INTO banner_analytics (banner_id, user_id, date, impressions, clicks, conversions)
  VALUES (p_banner_id, auth.uid(), today_date, total_impressions, total_clicks, total_conversions)
  ON CONFLICT (banner_id, user_id, date) 
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    updated_at = now();
END;
$$;