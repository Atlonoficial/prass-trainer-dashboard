-- Add policy for teachers to view student points
CREATE POLICY "Teachers can view student points" 
ON public.user_points 
FOR SELECT 
USING (is_teacher_of(auth.uid(), user_id));

-- Enable real-time for user_points table
ALTER TABLE public.user_points REPLICA IDENTITY FULL;

-- Add tables to real-time publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, skip
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_activities;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, skip
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, skip
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_redemptions;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, skip
  END;
END
$$;