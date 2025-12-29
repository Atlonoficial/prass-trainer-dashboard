-- Add allowed_payment_methods column to system_payment_config
ALTER TABLE system_payment_config 
ADD COLUMN IF NOT EXISTS allowed_payment_methods jsonb DEFAULT '["pix", "credit_card", "boleto"]'::jsonb;

-- Update existing config
UPDATE system_payment_config 
SET allowed_payment_methods = '["pix", "credit_card", "boleto"]'::jsonb
WHERE gateway_type = 'mercadopago' AND allowed_payment_methods IS NULL;

-- Add comment
COMMENT ON COLUMN system_payment_config.allowed_payment_methods IS 
'Array of enabled payment methods: pix, credit_card, debit_card, boleto';