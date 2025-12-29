-- Garantir que professores podem ver suas próprias recompensas
DROP POLICY IF EXISTS "Teachers can view own rewards" ON rewards_items;
CREATE POLICY "Teachers can view own rewards"
ON rewards_items FOR SELECT
USING (auth.uid() = created_by);

-- Garantir que professores podem ver resgates das suas recompensas
DROP POLICY IF EXISTS "Teachers can view redemptions of own rewards" ON reward_redemptions;
CREATE POLICY "Teachers can view redemptions of own rewards"
ON reward_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rewards_items ri 
    WHERE ri.id = reward_redemptions.reward_id 
    AND ri.created_by = auth.uid()
  )
);