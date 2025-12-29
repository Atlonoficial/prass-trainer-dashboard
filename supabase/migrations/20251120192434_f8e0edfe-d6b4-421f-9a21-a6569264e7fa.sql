-- Fase 1: Remover TODAS as políticas SELECT existentes em reward_redemptions para eliminar conflitos
DROP POLICY IF EXISTS "Users can view own redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Teachers can view redemptions of their rewards" ON reward_redemptions;
DROP POLICY IF EXISTS "Teachers can view redemptions of own rewards" ON reward_redemptions;
DROP POLICY IF EXISTS "Users and teachers can view redemptions" ON reward_redemptions;

-- Fase 2: Criar política unificada que permite alunos E professores acessarem os dados apropriados
CREATE POLICY "Users and teachers can view redemptions"
ON reward_redemptions FOR SELECT
TO authenticated
USING (
  -- Alunos veem seus próprios resgates
  auth.uid() = user_id
  OR
  -- Professores veem resgates das suas recompensas
  EXISTS (
    SELECT 1 FROM rewards_items ri 
    WHERE ri.id = reward_redemptions.reward_id 
    AND ri.created_by = auth.uid()
  )
);