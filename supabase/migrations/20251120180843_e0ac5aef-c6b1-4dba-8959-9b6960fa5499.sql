-- Fase 1: Limpar todas as políticas duplicadas ou conflitantes
DROP POLICY IF EXISTS "Teachers can view redemptions of their rewards" ON reward_redemptions;
DROP POLICY IF EXISTS "Teachers can view redemptions of own rewards" ON reward_redemptions;
DROP POLICY IF EXISTS "Teachers can view own rewards" ON rewards_items;

-- Fase 2: Criar políticas corretas com role authenticated

-- Política para rewards_items: professores podem ver suas próprias recompensas
CREATE POLICY "Teachers can view own rewards"
ON rewards_items FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Política para reward_redemptions: professores podem ver resgates das suas recompensas
CREATE POLICY "Teachers can view redemptions of own rewards"
ON reward_redemptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rewards_items ri 
    WHERE ri.id = reward_redemptions.reward_id 
    AND ri.created_by = auth.uid()
  )
);