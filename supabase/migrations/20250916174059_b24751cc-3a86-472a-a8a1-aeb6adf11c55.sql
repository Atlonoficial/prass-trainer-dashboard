-- ===== CORREÇÃO DA MIGRAÇÃO - MATERIALIZED VIEW SEM RLS =====

-- 1. Remover tentativa de RLS na materialized view (não suportado)
-- Materialized views não suportam RLS, então vamos usar uma função de acesso controlado

-- 2. Função segura para acessar métricas do professor (substitui view com RLS)
CREATE OR REPLACE FUNCTION public.get_teacher_metrics(p_teacher_id uuid DEFAULT NULL)
RETURNS TABLE(
    paid_count bigint,
    pending_count bigint, 
    failed_count bigint,
    total_revenue numeric,
    month date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se teacher_id não especificado, usar o usuário atual
    IF p_teacher_id IS NULL THEN
        p_teacher_id := auth.uid();
    END IF;
    
    -- Verificar se é teacher e se está acessando seus próprios dados
    IF NOT is_teacher(auth.uid()) OR (p_teacher_id != auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT 
        tm.paid_count,
        tm.pending_count,
        tm.failed_count,
        tm.total_revenue,
        tm.month::date
    FROM public.teacher_payment_metrics tm
    WHERE tm.teacher_id = p_teacher_id
    ORDER BY tm.month DESC;
END;
$$;

-- 3. Remover policies inválidas da materialized view se existirem
-- (PostgreSQL remove automaticamente, mas vamos garantir)

-- 4. Refazer refresh da view materializada
REFRESH MATERIALIZED VIEW public.teacher_payment_metrics;

-- 5. Conceder acesso à função
GRANT EXECUTE ON FUNCTION public.get_teacher_metrics(uuid) TO authenticated;