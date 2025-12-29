-- FASE 1: Correção Crítica da Validação

-- 1. Corrigir função de validação para permitir auto-compras
DROP FUNCTION IF EXISTS public.validate_transaction_data_enhanced(uuid, uuid, numeric, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced(
  p_teacher_id uuid, 
  p_student_id uuid, 
  p_amount numeric, 
  p_item_type text,
  p_service_pricing_id uuid DEFAULT NULL,
  p_plan_catalog_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validação básica de valor
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount;
  END IF;

  -- PERMITIR EXPLICITAMENTE auto-compras de professores (teacher_id = student_id)
  IF p_teacher_id = p_student_id THEN
    -- Validar se é realmente um professor
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_teacher_id AND user_type = 'teacher'
    ) THEN
      RAISE EXCEPTION 'Only teachers can make auto-purchases';
    END IF;
    
    -- Validar se o item existe baseado no tipo
    CASE p_item_type
      WHEN 'plan' THEN
        IF p_plan_catalog_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM plan_catalog 
          WHERE id = p_plan_catalog_id AND teacher_id = p_teacher_id AND is_active = true
        ) THEN
          RAISE EXCEPTION 'Invalid or inactive plan for auto-purchase';
        END IF;
      WHEN 'course' THEN
        IF p_course_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM courses 
          WHERE id = p_course_id AND instructor = p_teacher_id AND is_published = true
        ) THEN
          RAISE EXCEPTION 'Invalid or unpublished course for auto-purchase';
        END IF;
      WHEN 'service' THEN
        IF p_service_pricing_id IS NULL THEN
          RAISE EXCEPTION 'Service pricing ID required for service auto-purchase';
        END IF;
    END CASE;
    
    RETURN true;
  END IF;

  -- Para outros casos (não auto-compras), validar relacionamento teacher-student
  IF NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = p_student_id AND s.teacher_id = p_teacher_id
  ) THEN
    RAISE EXCEPTION 'Invalid teacher-student relationship for transaction';
  END IF;
  
  RETURN true;
END;
$$;

-- FASE 2: Sistema de Assinaturas Ativas

-- 2. Criar tabela de assinaturas ativas
CREATE TABLE IF NOT EXISTS public.active_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  subscription_id uuid REFERENCES plan_subscriptions(id),
  transaction_id uuid REFERENCES payment_transactions(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  auto_renew boolean DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, plan_id, teacher_id)
);

ALTER TABLE public.active_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies para active_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.active_subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student subscriptions" ON public.active_subscriptions  
FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "System can manage subscriptions" ON public.active_subscriptions
FOR ALL USING (auth.role() = 'service_role');

-- 3. Função para verificar acesso a funcionalidades
CREATE OR REPLACE FUNCTION public.user_has_feature_access(
  p_user_id uuid,
  p_teacher_id uuid,
  p_feature text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean := false;
BEGIN
  -- Verificar se o usuário tem assinatura ativa com essa funcionalidade
  SELECT EXISTS (
    SELECT 1 FROM active_subscriptions 
    WHERE user_id = p_user_id 
      AND teacher_id = p_teacher_id
      AND status = 'active'
      AND end_date >= CURRENT_DATE
      AND features ? p_feature
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- 4. Trigger para atualizar assinaturas quando payment é confirmado
CREATE OR REPLACE FUNCTION public.sync_active_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se transação foi paga e é de um plano
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.plan_catalog_id IS NOT NULL THEN
    
    -- Inserir/atualizar assinatura ativa
    INSERT INTO active_subscriptions (
      user_id, teacher_id, plan_id, transaction_id, 
      start_date, end_date, features
    )
    SELECT 
      NEW.student_id,
      NEW.teacher_id, 
      NEW.plan_catalog_id,
      NEW.id,
      CURRENT_DATE,
      CASE pc.interval
        WHEN 'monthly' THEN CURRENT_DATE + interval '1 month'
        WHEN 'quarterly' THEN CURRENT_DATE + interval '3 months' 
        WHEN 'yearly' THEN CURRENT_DATE + interval '1 year'
        ELSE CURRENT_DATE + interval '1 month'
      END,
      pc.features
    FROM plan_catalog pc 
    WHERE pc.id = NEW.plan_catalog_id
    ON CONFLICT (user_id, plan_id, teacher_id) 
    DO UPDATE SET
      end_date = EXCLUDED.end_date,
      features = EXCLUDED.features,
      status = 'active',
      updated_at = now();
      
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS sync_subscriptions_on_payment ON payment_transactions;
CREATE TRIGGER sync_subscriptions_on_payment
  AFTER UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_active_subscriptions();

-- 5. Função para processar renovações automáticas  
CREATE OR REPLACE FUNCTION public.process_subscription_renewals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar como expiradas as assinaturas vencidas
  UPDATE active_subscriptions 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND end_date < CURRENT_DATE;
    
  -- TODO: Implementar lógica de renovação automática
END;
$$;