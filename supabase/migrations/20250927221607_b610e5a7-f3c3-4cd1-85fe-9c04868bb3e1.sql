-- Adicionar coluna gateway_preference_id à tabela payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN gateway_preference_id TEXT;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_preference_id 
ON payment_transactions(gateway_preference_id);