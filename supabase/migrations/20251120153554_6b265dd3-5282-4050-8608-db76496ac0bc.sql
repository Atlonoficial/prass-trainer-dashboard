-- Add RLS policy for teachers to view redemptions of their own rewards
-- This enables synchronization between teacher panel and student app for pending redemptions

-- Create policy allowing teachers to view redemptions of rewards they created
CREATE POLICY "Teachers can view redemptions of their rewards"
ON public.reward_redemptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.rewards_items ri 
    WHERE ri.id = reward_redemptions.reward_id 
      AND ri.created_by = auth.uid()
  )
);

-- Add helpful comment
COMMENT ON POLICY "Teachers can view redemptions of their rewards" ON public.reward_redemptions IS 
'Allows teachers to view redemptions for rewards they created, enabling proper management of pending redemptions in sync with student app';