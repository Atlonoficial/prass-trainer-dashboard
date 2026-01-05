-- ==========================================
-- PRASS TRAINER - TABELAS DO SUPABASE
-- Execute este SQL no Supabase SQL Editor
-- ==========================================

-- 1) ENUM para billing_interval
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_interval') THEN
    CREATE TYPE public.billing_interval AS ENUM ('monthly', 'quarterly', 'yearly');
  END IF;
END $$;

-- ==========================================
-- 2) SERVICE PRICING (Precificação de Serviços)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  service_type TEXT NOT NULL, -- 'consultation', 'course', 'training_plan', 'nutrition_plan'
  service_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, service_type, service_id)
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own pricing" ON public.service_pricing
FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view teacher pricing" ON public.service_pricing
FOR SELECT USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM students s 
    WHERE s.user_id = auth.uid() AND s.teacher_id = service_pricing.teacher_id
  )
);

CREATE INDEX IF NOT EXISTS idx_service_pricing_teacher ON public.service_pricing(teacher_id);

-- ==========================================
-- 3) PLAN CATALOG (Catálogo de Planos)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.plan_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  interval public.billing_interval NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  highlighted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own plans" ON public.plan_catalog
FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students view teacher plans" ON public.plan_catalog
FOR SELECT TO authenticated
USING (
  is_active = true AND (
    auth.uid() = teacher_id OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid() AND s.teacher_id = plan_catalog.teacher_id
    )
  )
);

-- ==========================================
-- 4) PLAN SUBSCRIPTIONS (Assinaturas)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plan_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  start_at timestamptz,
  end_at timestamptz,
  approved_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students create own subscriptions" ON public.plan_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_user_id);

CREATE POLICY "Students view own subscriptions" ON public.plan_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = student_user_id);

CREATE POLICY "Teachers view own students subscriptions" ON public.plan_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers update subscriptions" ON public.plan_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_teacher ON public.plan_subscriptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_plan_subscriptions_student ON public.plan_subscriptions(student_user_id);

-- ==========================================
-- 5) PAYMENT TRANSACTIONS (Transações)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  service_pricing_id UUID REFERENCES public.service_pricing(id),
  plan_catalog_id UUID REFERENCES public.plan_catalog(id),
  gateway_type TEXT NOT NULL, -- 'mercado_pago', 'pagbank', 'stripe'
  gateway_transaction_id TEXT,
  gateway_payment_id TEXT,
  gateway_preference_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed', 'refunded', 'expired'
  payment_method TEXT, -- 'pix', 'credit_card', 'debit_card', 'boleto'
  item_type TEXT, -- 'plan', 'service', 'course'
  checkout_url TEXT,
  gateway_response JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own transactions" ON public.payment_transactions
FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view own transactions" ON public.payment_transactions
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "System can create transactions" ON public.payment_transactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" ON public.payment_transactions
FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_teacher ON public.payment_transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON public.payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_id ON public.payment_transactions(gateway_transaction_id);

-- ==========================================
-- 6) ATLON ASSISTANT (Conversas do Assistente)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.atlon_assistant_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT,
  thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlon_assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.atlon_assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.atlon_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlon_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own conversations" ON public.atlon_assistant_conversations
FOR ALL USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage messages in own conversations" ON public.atlon_assistant_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.atlon_assistant_conversations c
    WHERE c.id = atlon_assistant_messages.conversation_id
    AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.atlon_assistant_conversations c
    WHERE c.id = atlon_assistant_messages.conversation_id
    AND c.teacher_id = auth.uid()
  )
);

-- ==========================================
-- 7) TRIGGERS para updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;   
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_catalog_updated ON public.plan_catalog;
CREATE TRIGGER trg_plan_catalog_updated
BEFORE UPDATE ON public.plan_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_plan_subscriptions_updated ON public.plan_subscriptions;
CREATE TRIGGER trg_plan_subscriptions_updated
BEFORE UPDATE ON public.plan_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_service_pricing_updated ON public.service_pricing;
CREATE TRIGGER trg_service_pricing_updated
BEFORE UPDATE ON public.service_pricing
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payment_transactions_updated ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_atlon_conversations_updated ON public.atlon_assistant_conversations;
CREATE TRIGGER trg_atlon_conversations_updated
BEFORE UPDATE ON public.atlon_assistant_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- PRONTO! 
-- Execute este script no Supabase SQL Editor
-- ==========================================
