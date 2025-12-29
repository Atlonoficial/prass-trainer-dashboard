-- Add thread_id column to atlon_assistant_conversations table
ALTER TABLE public.atlon_assistant_conversations 
ADD COLUMN IF NOT EXISTS thread_id text;