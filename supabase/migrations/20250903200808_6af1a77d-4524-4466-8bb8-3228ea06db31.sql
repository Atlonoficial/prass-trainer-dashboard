-- Enable realtime for rewards_items table
ALTER TABLE public.rewards_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE rewards_items;