-- Fix search_path security warning for reward_redemptions trigger function
CREATE OR REPLACE FUNCTION update_reward_redemptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;