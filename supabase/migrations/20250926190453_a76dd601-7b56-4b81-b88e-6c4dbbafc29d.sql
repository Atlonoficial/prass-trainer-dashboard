-- FASE 1: CORREÇÕES SIMPLES DE SEGURANÇA (Sem conflitos)
-- Adicionar funções de validação e auditoria sem conflitos de políticas

-- 1. Criar função de validação de pagamentos
CREATE OR REPLACE FUNCTION public.validate_payment_data_local(
  p_amount numeric,
  p_student_id uuid,
  p_teacher_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 2. Criar tabela de auditoria específica para pagamentos (se não existir)
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS para auditoria
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Política para service role gerenciar logs
DROP POLICY IF EXISTS "Service role can manage audit logs" ON payment_audit_log;
CREATE POLICY "Service role can manage audit logs" 
ON payment_audit_log FOR ALL
USING (auth.role() = 'service_role');

-- 3. Criar função de trigger para auditoria
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO payment_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't break the operation
  RAISE WARNING 'Audit log failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. Adicionar triggers de auditoria se não existirem
DO $$ 
BEGIN
  -- Drop existing triggers to avoid conflicts
  DROP TRIGGER IF EXISTS audit_payment_transactions ON payment_transactions;
  DROP TRIGGER IF EXISTS audit_teacher_payment_settings ON teacher_payment_settings;
  
  -- Add new triggers
  CREATE TRIGGER audit_payment_transactions
    AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();
    
  CREATE TRIGGER audit_teacher_payment_settings
    AFTER INSERT OR UPDATE OR DELETE ON teacher_payment_settings
    FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();
    
  RAISE NOTICE 'Audit triggers created successfully';
END $$;

-- 5. Otimização: Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_teacher_status 
ON payment_transactions (teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_student_teacher 
ON payment_transactions (student_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
ON payment_transactions (created_at DESC);

-- 6. Criar função para calcular status de pagamento local
CREATE OR REPLACE FUNCTION public.calculate_student_payment_status(
  p_student_id uuid,
  p_teacher_id uuid
)
RETURNS TABLE(
  student_id uuid,
  status text,
  next_payment_date date,
  overdue_amount numeric,
  total_pending numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;