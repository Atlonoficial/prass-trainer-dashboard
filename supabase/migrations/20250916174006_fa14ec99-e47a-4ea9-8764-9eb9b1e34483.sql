-- ===== CORREÇÃO DOS AVISOS DE SEGURANÇA =====

-- 1. Corrigir Function Search Path Mutable - Adicionar SET search_path
CREATE OR REPLACE FUNCTION public.refresh_teacher_metrics()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Refresh apenas para o professor específico (mais eficiente)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.teacher_payment_metrics;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_data_optimized(p_teacher_id uuid)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Single query que busca todos os dados necessários de uma vez
    SELECT json_build_object(
        'students', (
            SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'user_id', s.user_id, 
                    'teacher_id', s.teacher_id,
                    'name', COALESCE(p.name, 'Estudante ' || SUBSTRING(s.user_id::text, 1, 8)),
                    'email', COALESCE(p.email, ''),
                    'phone', COALESCE(p.phone, ''),
                    'avatar', p.avatar_url,
                    'plan', COALESCE(s.active_plan, ''),
                    'mode', COALESCE(s.mode, ''),
                    'status', CASE WHEN s.membership_status = 'active' THEN 'ativo' ELSE 'inativo' END,
                    'goal', COALESCE(array_to_string(s.goals, ', '), ''),
                    'expiration', COALESCE(s.membership_expiry::text, ''),
                    'created_at', s.created_at,
                    'updated_at', s.updated_at
                )
            )
            FROM public.students s
            LEFT JOIN public.profiles p ON p.id = s.user_id
            WHERE s.teacher_id = p_teacher_id
            ORDER BY s.created_at DESC
            LIMIT 100 -- Limitar para performance
        ),
        'plans', (
            SELECT json_agg(pc.*)
            FROM public.plan_catalog pc
            WHERE pc.teacher_id = p_teacher_id AND pc.is_active = true
            ORDER BY pc.created_at DESC
        ),
        'subscriptions', (
            SELECT json_agg(ps.*)
            FROM public.plan_subscriptions ps
            WHERE ps.teacher_id = p_teacher_id
            ORDER BY ps.created_at DESC
            LIMIT 50
        ),
        'payment_metrics', (
            SELECT row_to_json(metrics)
            FROM (
                SELECT 
                    COALESCE(SUM(paid_count), 0) as paid_transactions,
                    COALESCE(SUM(pending_count), 0) as pending_transactions,
                    COALESCE(SUM(failed_count), 0) as failed_transactions,
                    COALESCE(SUM(total_revenue), 0) as total_revenue
                FROM public.teacher_payment_metrics
                WHERE teacher_id = p_teacher_id
            ) metrics
        ),
        'recent_transactions', (
            SELECT json_agg(
                json_build_object(
                    'id', pt.id,
                    'student_id', pt.student_id,
                    'amount', pt.amount,
                    'status', pt.status,
                    'created_at', pt.created_at,
                    'paid_at', pt.paid_at
                )
            )
            FROM public.payment_transactions pt
            WHERE pt.teacher_id = p_teacher_id
            ORDER BY pt.created_at DESC
            LIMIT 20
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 2. Proteger a Materialized View com RLS - Remover da API ou adicionar políticas
ALTER TABLE public.teacher_payment_metrics ENABLE ROW LEVEL SECURITY;

-- Política para a view materializada - apenas professores podem ver suas próprias métricas  
CREATE POLICY "Teachers can view own payment metrics" ON public.teacher_payment_metrics
    FOR SELECT USING (
        auth.uid() = teacher_id AND
        is_teacher(auth.uid())
    );

-- 3. Refresh inicial da view materializada
REFRESH MATERIALIZED VIEW public.teacher_payment_metrics;