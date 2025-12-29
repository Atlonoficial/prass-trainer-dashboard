-- Remove duplicate triggers to prevent redundant achievement checks
-- Multiple migrations created duplicate triggers, this cleans them up

-- Drop all existing triggers on gamification_activities related to achievements
DROP TRIGGER IF EXISTS check_achievements_after_activity ON public.gamification_activities;
DROP TRIGGER IF EXISTS trigger_check_achievements_after_activity ON public.gamification_activities;

-- Now we can safely drop the old function
DROP FUNCTION IF EXISTS public.trigger_check_achievements();

-- Create a single, clean trigger function
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_after_activity()
RETURNS trigger AS $$
BEGIN
  -- Call the achievement check function for the user who just gained points
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a single trigger (no duplicates)
CREATE TRIGGER check_achievements_after_activity
AFTER INSERT ON public.gamification_activities
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_achievements_after_activity();

-- Add helpful comments
COMMENT ON TRIGGER check_achievements_after_activity ON public.gamification_activities IS 
'Automatically checks and awards achievements when a user gains points through any activity';

COMMENT ON FUNCTION public.trigger_check_achievements_after_activity() IS 
'Trigger function that calls check_and_award_achievements after points are awarded';