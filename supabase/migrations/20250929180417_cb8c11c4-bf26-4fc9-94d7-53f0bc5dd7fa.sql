-- Add push token columns to profiles table for mobile notifications
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
CREATE INDEX IF NOT EXISTS idx_profiles_platform ON profiles(platform);

-- Comment
COMMENT ON COLUMN profiles.push_token IS 'Native push notification token (Android/iOS)';
COMMENT ON COLUMN profiles.platform IS 'Platform: web, android, or ios';