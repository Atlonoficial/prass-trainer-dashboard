-- ===== FASE 1: ISOLAMENTO POR PROFESSOR - OTIMIZAÇÃO RLS E ÍNDICES =====

-- 1. Criar índices compostos otimizados para isolamento por professor
CREATE INDEX IF NOT EXISTS idx_students_teacher_created ON public.students(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_teacher_created ON public.payment_transactions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_teacher_status ON public.plan_subscriptions(teacher_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_catalog_teacher_active ON public.plan_catalog(teacher_id, is_active, created_at DESC);

-- 2. Otimizar políticas RLS existentes com melhor performance
-- Política otimizada para students com filtro automático
DROP POLICY IF EXISTS "Teachers can manage own students" ON public.students;
CREATE POLICY "Teachers manage own students optimized" ON public.students
    FOR ALL USING (
        auth.uid() = teacher_id AND 
        is_teacher(auth.uid())
    );

-- Política otimizada para transactions com índice
DROP POLICY IF EXISTS "Teachers can view own transactions" ON public.payment_transactions;
CREATE POLICY "Teachers view own transactions optimized" ON public.payment_transactions
    FOR SELECT USING (
        auth.uid() = teacher_id AND
        is_teacher(auth.uid())
    );

-- Política otimizada para subscriptions
DROP POLICY IF EXISTS "Teachers view own students subscriptions" ON public.plan_subscriptions;
CREATE POLICY "Teachers view subscriptions optimized" ON public.plan_subscriptions
    FOR SELECT USING (
        auth.uid() = teacher_id AND
        is_teacher(auth.uid())
    );

-- 3. Criar view materializada para métricas de pagamento (performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.teacher_payment_metrics AS
SELECT 
    teacher_id,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    SUM(amount) FILTER (WHERE status = 'paid') as total_revenue,
    DATE_TRUNC('month', created_at) as month,
    MAX(created_at) as last_updated
FROM public.payment_transactions
GROUP BY teacher_id, DATE_TRUNC('month', created_at);

-- Índice para a view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_metrics_unique ON public.teacher_payment_metrics(teacher_id, month);

-- 4. Função para refresh automático da view (chamada via trigger)
CREATE OR REPLACE FUNCTION public.refresh_teacher_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh apenas para o professor específico (mais eficiente)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.teacher_payment_metrics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para atualizar métricas automaticamente
DROP TRIGGER IF EXISTS trigger_refresh_teacher_metrics ON public.payment_transactions;
CREATE TRIGGER trigger_refresh_teacher_metrics
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_teacher_metrics();

-- 6. Função otimizada para buscar dados do professor (substitui múltiplas queries)
CREATE OR REPLACE FUNCTION public.get_teacher_data_optimized(p_teacher_id uuid)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Política para a função otimizada
GRANT EXECUTE ON FUNCTION public.get_teacher_data_optimized(uuid) TO authenticated;