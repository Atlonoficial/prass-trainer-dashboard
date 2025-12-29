-- Add new fields to profiles table for teacher public profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS professional_title text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS whatsapp_url text,
ADD COLUMN IF NOT EXISTS show_profile_to_students boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.professional_title IS 'Professional title/occupation of the teacher';
COMMENT ON COLUMN public.profiles.bio IS 'Biography/description of the teacher';
COMMENT ON COLUMN public.profiles.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.profiles.facebook_url IS 'Facebook profile URL';
COMMENT ON COLUMN public.profiles.youtube_url IS 'YouTube channel URL';
COMMENT ON COLUMN public.profiles.whatsapp_url IS 'WhatsApp contact URL';
COMMENT ON COLUMN public.profiles.show_profile_to_students IS 'Whether to show profile to students in the app';