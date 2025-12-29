-- RLS Policy para permitir professores deletarem resgates de suas próprias recompensas
CREATE POLICY "Teachers can delete redemptions of their rewards"
ON reward_redemptions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rewards_items ri
    WHERE ri.id = reward_redemptions.reward_id
    AND ri.created_by = auth.uid()
  )
);