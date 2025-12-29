-- FASE 1: CORREÇÃO CRÍTICA DA FUNÇÃO SQL get_teacher_data_optimized
-- Substituir função quebrada por uma versão funcional

DROP FUNCTION IF EXISTS public.get_teacher_data_optimized(uuid);

CREATE OR REPLACE FUNCTION public.get_teacher_data_optimized(p_teacher_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Query otimizada usando múltiplas queries simples ao invés de joins complexos
    SELECT json_build_object(
        'students', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', s.id,
                    'user_id', s.user_id,
                    'teacher_id', s.teacher_id,
                    'name', COALESCE(p.name, p.email, 'Sem Nome'),
                    'email', p.email,
                    'phone', p.phone,
                    'avatar', p.avatar_url,
                    'plan', COALESCE(s.active_plan, 'Sem plano'),
                    'mode', COALESCE(s.mode, 'online'),
                    'status', COALESCE(s.membership_status, 'inactive'),
                    'goal', COALESCE(array_to_string(s.goals, ', '), 'Não definido'),
                    'expiration', COALESCE(s.membership_expiry::text, ''),
                    'created_at', s.created_at::text,
                    'updated_at', s.updated_at::text
                )
            ), '[]'::json)
            FROM students s
            LEFT JOIN profiles p ON p.id = s.user_id
            WHERE s.teacher_id = p_teacher_id
        ),
        'plans', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', pc.id,
                    'teacher_id', pc.teacher_id,
                    'name', pc.name,
                    'description', pc.description,
                    'price', pc.price,
                    'currency', pc.currency,
                    'interval', pc.interval,
                    'features', COALESCE(pc.features, '[]'::jsonb),
                    'is_active', pc.is_active,
                    'highlighted', pc.highlighted,
                    'icon', pc.icon,
                    'created_at', pc.created_at::text,
                    'updated_at', pc.updated_at::text
                )
            ), '[]'::json)
            FROM plan_catalog pc
            WHERE pc.teacher_id = p_teacher_id
        ),
        'subscriptions', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', ps.id,
                    'student_user_id', ps.student_user_id,
                    'teacher_id', ps.teacher_id,
                    'plan_id', ps.plan_id,
                    'status', ps.status,
                    'start_at', ps.start_at::text,
                    'end_at', ps.end_at::text,
                    'approved_at', ps.approved_at::text,
                    'created_at', ps.created_at::text,
                    'updated_at', ps.updated_at::text
                )
            ), '[]'::json)
            FROM plan_subscriptions ps
            WHERE ps.teacher_id = p_teacher_id
        ),
        'recent_transactions', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', pt.id,
                    'teacher_id', pt.teacher_id,
                    'student_id', pt.student_id,
                    'amount', pt.amount,
                    'status', pt.status,
                    'created_at', pt.created_at::text,
                    'paid_at', pt.paid_at::text
                )
            ), '[]'::json)
            FROM payment_transactions pt
            WHERE pt.teacher_id = p_teacher_id
            ORDER BY pt.created_at DESC
            LIMIT 50
        ),
        'payment_metrics', (
            SELECT json_build_object(
                'total_revenue', COALESCE(SUM(CASE WHEN pt.status = 'paid' THEN pt.amount ELSE 0 END), 0),
                'paid_transactions', COUNT(CASE WHEN pt.status = 'paid' THEN 1 END),
                'pending_transactions', COUNT(CASE WHEN pt.status = 'pending' THEN 1 END),
                'failed_transactions', COUNT(CASE WHEN pt.status = 'failed' THEN 1 END)
            )
            FROM payment_transactions pt
            WHERE pt.teacher_id = p_teacher_id
        )
    ) INTO result;
    
    RETURN result;
END;
$function$;