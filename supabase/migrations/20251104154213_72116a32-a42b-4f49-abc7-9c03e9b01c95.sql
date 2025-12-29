-- FASE 1 E 2: CORRIGIR DADOS E CRIAR WEBHOOK_EVENTS
-- Primeiro, desabilitar temporariamente registros com credenciais inválidas
UPDATE teacher_payment_settings 
SET is_active = false 
WHERE is_active = true 
  AND (
    credentials IS NULL 
    OR credentials::text = 'null' 
    OR credentials::text = '[]'
    OR credentials::text = '{}'
    OR credentials->>'api_key' IS NULL 
    OR credentials->>'api_key' = ''
  );

-- Garantir que credentials é sempre JSONB válido
ALTER TABLE teacher_payment_settings 
  ALTER COLUMN credentials SET DEFAULT '{}'::jsonb;

-- Atualizar registros com credentials NULL
UPDATE teacher_payment_settings 
SET credentials = '{}'::jsonb 
WHERE credentials IS NULL;

-- Agora adicionar a constraint
ALTER TABLE teacher_payment_settings 
DROP CONSTRAINT IF EXISTS check_credentials_if_active;

ALTER TABLE teacher_payment_settings 
ADD CONSTRAINT check_credentials_if_active 
CHECK (
  (NOT is_active) OR 
  (is_active AND credentials->>'api_key' IS NOT NULL AND credentials->>'api_key' != '')
);

-- FASE 2: Criar tabela webhook_events
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON webhook_events(processed, retry_count) WHERE NOT processed;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_events_updated_at ON webhook_events;
CREATE TRIGGER webhook_events_updated_at
BEFORE UPDATE ON webhook_events
FOR EACH ROW
EXECUTE FUNCTION update_webhook_events_updated_at();

-- RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON webhook_events;
CREATE POLICY "Service role only" ON webhook_events
  USING (auth.role() = 'service_role');