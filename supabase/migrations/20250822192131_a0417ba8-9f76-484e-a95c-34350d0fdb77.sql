-- Fix RLS policies for user_points to allow teachers to see student data
DROP POLICY IF EXISTS "Teachers can view student points" ON public.user_points;

CREATE POLICY "Teachers can view student points" 
ON public.user_points 
FOR SELECT 
USING (is_teacher_of(auth.uid(), user_id));

CREATE POLICY "Users can view own points" 
ON public.user_points 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enable real-time for user_points table
ALTER TABLE public.user_points REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;

-- Also enable real-time for other gamification tables
ALTER TABLE public.gamification_activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_activities;

ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;

ALTER TABLE public.reward_redemptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_redemptions;