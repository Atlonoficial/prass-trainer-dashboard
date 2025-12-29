-- Criar tabela de configurações de pagamento dos professores
CREATE TABLE public.teacher_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('mercado_pago', 'pagbank', 'stripe', 'pix_manual')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}', -- Credenciais criptografadas por gateway
  webhook_config JSONB DEFAULT '{}', -- URLs de webhook e configurações
  commission_rate NUMERIC(5,2) DEFAULT 0.00, -- Taxa de comissão personalizada
  pix_key TEXT, -- Chave PIX para pagamentos manuais
  bank_details JSONB DEFAULT '{}', -- Dados bancários para boletos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, gateway_type)
);

-- Habilitar RLS
ALTER TABLE public.teacher_payment_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para teacher_payment_settings
CREATE POLICY "Teachers can manage own payment settings"
ON public.teacher_payment_settings
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Expandir tabela payments com campos dos gateways
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_metadata JSONB DEFAULT '{}';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_type TEXT; -- 'course', 'plan', 'appointment'
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_id UUID;

-- Criar tabela para log de webhooks
CREATE TABLE public.payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_type TEXT NOT NULL,
  webhook_data JSONB NOT NULL,
  payment_id UUID REFERENCES public.payments(id),
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para webhooks
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Política para webhooks (apenas system/service role)
CREATE POLICY "Service role can manage webhooks"
ON public.payment_webhooks
FOR ALL
USING (auth.role() = 'service_role');

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction ON public.payments(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_status ON public.payments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON public.payment_webhooks(processed, created_at);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_teacher_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_teacher_payment_settings_updated_at
BEFORE UPDATE ON public.teacher_payment_settings
FOR EACH ROW
EXECUTE FUNCTION update_teacher_payment_settings_updated_at();