-- Create table for tracking real item usage history
CREATE TABLE IF NOT EXISTS public.recent_items_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('meal', 'exercise', 'meal_plan', 'formula', 'menu', 'technique', 'workout')),
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_recent_items_history_user_used 
ON public.recent_items_history(user_id, used_at DESC);

-- Create index for item lookups
CREATE INDEX IF NOT EXISTS idx_recent_items_history_item 
ON public.recent_items_history(item_id, item_type);

-- Enable RLS
ALTER TABLE public.recent_items_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own history
CREATE POLICY "Users can view their own recent items history"
ON public.recent_items_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own history
CREATE POLICY "Users can insert their own recent items history"
ON public.recent_items_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own history (for cleanup)
CREATE POLICY "Users can delete their own recent items history"
ON public.recent_items_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public.recent_items_history IS 'Tracks user interactions with predefined items (meals, exercises, formulas, etc.) to show truly recent/used items rather than just creation date';

-- Optional: Function to cleanup old history (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_recent_items_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.recent_items_history
  WHERE used_at < NOW() - INTERVAL '30 days';
END;
$$;