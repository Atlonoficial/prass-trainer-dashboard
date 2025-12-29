-- Add profile_complete column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN NOT NULL DEFAULT false;

-- Update existing profiles to be complete (so they don't see the setup screen)
UPDATE public.profiles 
SET profile_complete = true 
WHERE user_type IS NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_complete ON public.profiles(profile_complete) WHERE profile_complete = false;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.profile_complete IS 'Indicates if user has completed their initial setup and chosen their role';