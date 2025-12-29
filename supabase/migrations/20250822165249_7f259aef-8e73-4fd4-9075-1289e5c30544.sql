-- Create user presence table
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_typing_in_conversation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all presence" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update own presence" ON public.user_presence FOR ALL USING (auth.uid() = user_id);

-- Add delivered_at field to chat_messages for double check
ALTER TABLE public.chat_messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;

-- Create update_user_presence RPC function
CREATE OR REPLACE FUNCTION public.update_user_presence(
  is_online_param BOOLEAN DEFAULT true,
  typing_in_conversation_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, is_typing_in_conversation, updated_at)
  VALUES (auth.uid(), is_online_param, typing_in_conversation_param, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    is_online = is_online_param,
    is_typing_in_conversation = typing_in_conversation_param,
    last_seen = now(),
    updated_at = now();
END;
$$;

-- Enable realtime for user_presence table
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.user_presence;