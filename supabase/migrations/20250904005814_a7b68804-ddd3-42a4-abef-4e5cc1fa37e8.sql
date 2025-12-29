-- Enable realtime for workouts table
ALTER TABLE public.workouts REPLICA IDENTITY FULL;

-- Add workouts table to realtime publication
-- Note: This is done automatically by Supabase for all tables
-- We just need to ensure it's working correctly