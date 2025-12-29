-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own blocks"
    ON public.blocked_users
    FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
    ON public.blocked_users
    FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON public.blocked_users
    FOR DELETE
    USING (auth.uid() = blocker_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);
