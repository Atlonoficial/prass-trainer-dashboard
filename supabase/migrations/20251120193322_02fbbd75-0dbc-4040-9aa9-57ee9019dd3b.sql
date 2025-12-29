-- Remove a constraint antiga que não incluía tipos de recompensas
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Cria nova constraint incluindo tipos de recompensas e resgates
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'workout'::text,
  'meal'::text,
  'reminder'::text,
  'achievement'::text,
  'general'::text,
  'payment'::text,
  'appointment'::text,
  'message'::text,
  'course'::text,
  'reward'::text,
  'reward_redemption'::text
]));