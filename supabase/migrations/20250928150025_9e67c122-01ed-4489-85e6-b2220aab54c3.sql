-- Simple migration to add user_id column to notifications if not exists
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update existing notifications to have user_id from created_by
UPDATE public.notifications 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;