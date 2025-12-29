-- Add missing columns to reward_redemptions table
ALTER TABLE reward_redemptions 
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_reward_redemptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reward_redemptions_updated_at
  BEFORE UPDATE ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_redemptions_updated_at();