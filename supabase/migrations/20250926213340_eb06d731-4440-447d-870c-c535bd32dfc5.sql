-- FASE 1: Reestruturação Segura do Banco de Dados para Checkout Robusto

-- 1. Remover constraint problemática atual  
ALTER TABLE public.payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_service_pricing_id_fkey;

-- 2. Adicionar novos campos sem constraints por enquanto
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS plan_catalog_id UUID,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS course_id UUID,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 3. Atualizar registros existentes para ter pelo menos um tipo válido
UPDATE public.payment_transactions 
SET item_type = 'manual_payment'
WHERE service_pricing_id IS NULL 
    AND plan_catalog_id IS NULL 
    AND course_id IS NULL;

-- 4. Agora criar as constraints com os dados limpos
ALTER TABLE public.payment_transactions 
ADD CONSTRAINT payment_transactions_plan_catalog_id_fkey 
FOREIGN KEY (plan_catalog_id) REFERENCES public.plan_catalog(id);

ALTER TABLE public.payment_transactions 
ADD CONSTRAINT payment_transactions_service_pricing_id_fkey 
FOREIGN KEY (service_pricing_id) REFERENCES public.service_pricing(id);

-- 5. Constraint flexível que permite manual_payment sem referências
ALTER TABLE public.payment_transactions 
ADD CONSTRAINT check_item_reference_flexible 
CHECK (
  service_pricing_id IS NOT NULL OR 
  plan_catalog_id IS NOT NULL OR 
  course_id IS NOT NULL OR
  item_type = 'manual_payment'
);

-- 6. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_plan_catalog_id 
ON public.payment_transactions(plan_catalog_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created_at 
ON public.payment_transactions(status, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_item_type 
ON public.payment_transactions(item_type);

-- 7. Função melhorada para validar dados de transação
CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar amount
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be positive';
  END IF;
  
  -- Validar teacher-student relationship para pagamentos não manuais
  IF NEW.student_id IS NOT NULL AND COALESCE(NEW.item_type, '') != 'manual_payment' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students s 
      WHERE s.user_id = NEW.student_id AND s.teacher_id = NEW.teacher_id
    ) THEN
      RAISE EXCEPTION 'Invalid teacher-student relationship for transaction';
    END IF;
  END IF;
  
  -- Auto-definir item_type se não especificado
  IF NEW.item_type IS NULL THEN
    IF NEW.plan_catalog_id IS NOT NULL THEN
      NEW.item_type = 'plan';
    ELSIF NEW.service_pricing_id IS NOT NULL THEN
      NEW.item_type = 'service';
    ELSIF NEW.course_id IS NOT NULL THEN
      NEW.item_type = 'course';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;