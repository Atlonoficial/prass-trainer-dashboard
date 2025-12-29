-- Enable realtime for progress table
ALTER TABLE public.progress REPLICA IDENTITY FULL;

-- Add progress table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;