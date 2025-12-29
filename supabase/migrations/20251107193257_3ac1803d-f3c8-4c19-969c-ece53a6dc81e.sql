-- Add missing fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Create public_profiles table
CREATE TABLE IF NOT EXISTS public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  professional_title TEXT,
  profile_image_url TEXT,
  banner_image_url TEXT,
  bio TEXT,
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  whatsapp TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for public_profiles
CREATE POLICY "Users can view their own public profile"
  ON public_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own public profile"
  ON public_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own public profile"
  ON public_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('profile-images', 'profile-images', true),
  ('banner-images', 'banner-images', true)
ON CONFLICT DO NOTHING;

-- Storage policies for profile-images
CREATE POLICY "Users can upload their profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view profile images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- Storage policies for banner-images
CREATE POLICY "Users can upload their banner images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'banner-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their banner images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'banner-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banner-images');