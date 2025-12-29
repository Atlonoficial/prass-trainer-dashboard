-- FASE 5: Finalização do Sistema de Checkout Robusto

-- 1. Adicionar trigger de validação de dados
DROP TRIGGER IF EXISTS validate_transaction_trigger ON public.payment_transactions;
CREATE TRIGGER validate_transaction_trigger
  BEFORE INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_data_enhanced();

-- 2. Adicionar função para limpeza automática de transações expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Marcar como expiradas transações pendentes que passaram do prazo
  UPDATE public.payment_transactions 
  SET 
    status = 'expired',
    last_error = 'Transaction expired automatically',
    updated_at = now()
  WHERE status IN ('pending', 'processing') 
    AND expires_at < now()
    AND expires_at IS NOT NULL;
    
  -- Log quantas foram atualizadas
  RAISE NOTICE 'Cleanup completed: % transactions marked as expired', 
    (SELECT COUNT(*) FROM public.payment_transactions WHERE status = 'expired' AND updated_at > now() - interval '1 minute');
END;
$$;

-- 3. Criar índices otimizados para consultas de pagamento
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_expires 
ON public.payment_transactions(status, expires_at) 
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_teacher_status 
ON public.payment_transactions(teacher_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_id 
ON public.payment_transactions(gateway_transaction_id) 
WHERE gateway_transaction_id IS NOT NULL;

-- 4. Função para estatísticas do sistema de pagamentos
CREATE OR REPLACE FUNCTION public.get_payment_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  total_transactions integer;
  success_transactions integer;
  failed_transactions integer;
  pending_transactions integer;
  total_revenue numeric;
BEGIN
  -- Contar transações por status
  SELECT 
    COUNT(*) FILTER (WHERE true) as total,
    COUNT(*) FILTER (WHERE status = 'paid') as success,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as pending,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as revenue
  INTO total_transactions, success_transactions, failed_transactions, pending_transactions, total_revenue
  FROM public.payment_transactions
  WHERE created_at > now() - interval '30 days';
  
  result := jsonb_build_object(
    'total_transactions', total_transactions,
    'success_transactions', success_transactions,
    'failed_transactions', failed_transactions,
    'pending_transactions', pending_transactions,
    'total_revenue', total_revenue,
    'success_rate', CASE 
      WHEN total_transactions > 0 
      THEN round((success_transactions::numeric / total_transactions::numeric) * 100, 2)
      ELSE 0 
    END,
    'last_updated', now()
  );
  
  RETURN result;
END;
$$;

-- 5. Função para rollback de transações com falha
CREATE OR REPLACE FUNCTION public.rollback_failed_transaction(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  transaction_record record;
BEGIN
  -- Buscar transação
  SELECT * INTO transaction_record
  FROM public.payment_transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Só permite rollback de transações failed ou expired
  IF transaction_record.status NOT IN ('failed', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not eligible for rollback');
  END IF;
  
  -- Marcar como cancelled e adicionar metadata
  UPDATE public.payment_transactions
  SET 
    status = 'cancelled',
    last_error = 'Rolled back due to failure',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'rollback_at', now(),
      'rollback_reason', 'manual_rollback'
    ),
    updated_at = now()
  WHERE id = p_transaction_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction rolled back successfully');
END;
$$;