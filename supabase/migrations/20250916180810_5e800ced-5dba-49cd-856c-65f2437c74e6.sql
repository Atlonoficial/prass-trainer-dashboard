-- Corrigir a função get_teacher_data_optimized para resolver o erro de GROUP BY
CREATE OR REPLACE FUNCTION public.get_teacher_data_optimized(p_teacher_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Query otimizada sem GROUP BY problemático
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
            LIMIT 100
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
            SELECT json_build_object(
                'paid_transactions', COALESCE(SUM(paid_count), 0),
                'pending_transactions', COALESCE(SUM(pending_count), 0),
                'failed_transactions', COALESCE(SUM(failed_count), 0),
                'total_revenue', COALESCE(SUM(total_revenue), 0)
            )
            FROM public.teacher_payment_metrics
            WHERE teacher_id = p_teacher_id
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
$function$