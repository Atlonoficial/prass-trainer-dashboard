-- FASE 1: Criar tabela de configuração global do sistema de pagamentos
CREATE TABLE IF NOT EXISTS public.system_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_type TEXT NOT NULL DEFAULT 'mercado_pago',
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_sandbox BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  webhook_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Garantir apenas 1 configuração por gateway
  CONSTRAINT unique_gateway_type UNIQUE(gateway_type),
  
  -- Validação de credenciais quando ativo
  CONSTRAINT valid_credentials_if_active CHECK (
    (is_active = false) OR 
    (is_active = true AND credentials IS NOT NULL AND credentials != '{}')
  )
);

-- Habilitar RLS
ALTER TABLE public.system_payment_config ENABLE ROW LEVEL SECURITY;

-- Política: Apenas service_role pode gerenciar (super admin)
CREATE POLICY "Service role can manage global payment config"
  ON public.system_payment_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- Política: Authenticated users podem visualizar config ativa (para edge functions)
CREATE POLICY "Authenticated users can view active config"
  ON public.system_payment_config
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_system_payment_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_system_payment_config_updated_at
  BEFORE UPDATE ON public.system_payment_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_payment_config_updated_at();

-- Inserir configuração inicial do Mercado Pago (sandbox mode)
INSERT INTO public.system_payment_config (
  gateway_type, 
  credentials, 
  is_active, 
  is_sandbox
) VALUES (
  'mercado_pago',
  '{"access_token": "", "public_key": ""}'::jsonb,
  false,
  true
) ON CONFLICT (gateway_type) DO NOTHING;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_system_payment_config_gateway_active 
  ON public.system_payment_config(gateway_type, is_active) 
  WHERE is_active = true;