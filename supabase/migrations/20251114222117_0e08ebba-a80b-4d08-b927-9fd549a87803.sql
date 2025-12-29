-- Add preference_id column to manual_charges table
ALTER TABLE manual_charges 
ADD COLUMN IF NOT EXISTS preference_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manual_charges_preference_id 
ON manual_charges(preference_id);

-- Add comment
COMMENT ON COLUMN manual_charges.preference_id IS 'Mercado Pago preference ID for payment link';