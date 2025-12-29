-- Add missing foreign key constraints for banner system
-- This will ensure data integrity and fix the query issues

-- Add foreign key constraint from banner_analytics to banners
ALTER TABLE public.banner_analytics 
ADD CONSTRAINT fk_banner_analytics_banner_id 
FOREIGN KEY (banner_id) REFERENCES public.banners(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from banner_interactions to banners  
ALTER TABLE public.banner_interactions 
ADD CONSTRAINT fk_banner_interactions_banner_id 
FOREIGN KEY (banner_id) REFERENCES public.banners(id) 
ON DELETE CASCADE;

-- Add indexes for better performance on the foreign key columns
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON public.banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_interactions_banner_id ON public.banner_interactions(banner_id);

-- Add index for date-based queries on banner_analytics
CREATE INDEX IF NOT EXISTS idx_banner_analytics_date ON public.banner_analytics(date);

-- Add index for user-based queries on banner_analytics
CREATE INDEX IF NOT EXISTS idx_banner_analytics_user_id ON public.banner_analytics(user_id);

-- Add index for interaction type queries on banner_interactions
CREATE INDEX IF NOT EXISTS idx_banner_interactions_type ON public.banner_interactions(interaction_type);

-- Add index for created_at queries on banner_interactions
CREATE INDEX IF NOT EXISTS idx_banner_interactions_created_at ON public.banner_interactions(created_at);