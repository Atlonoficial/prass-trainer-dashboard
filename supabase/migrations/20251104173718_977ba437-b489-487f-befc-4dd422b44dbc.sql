-- ============================================
-- MIGRATION: Simplificar e corrigir RLS para system_payment_config (v2)
-- Permitir acesso tanto via profiles.user_type quanto via user_roles.role
-- ============================================

-- 1. Remover política antiga que usa apenas has_role
DROP POLICY IF EXISTS "Teachers and admins can view payment config" ON system_payment_config;

-- 2. Remover a política duplicada se existir
DROP POLICY IF EXISTS "Authenticated users can view active config" ON system_payment_config;

-- 3. Criar nova política combinada que aceita AMBOS os métodos
CREATE POLICY "Teachers and admins can view and manage payment config" 
ON system_payment_config 
FOR ALL
TO authenticated
USING (
  -- Permitir se o usuário tem role teacher ou admin na tabela user_roles
  has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR
  -- OU se o profile tem user_type teacher ou admin
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type IN ('teacher', 'admin')
  )
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type IN ('teacher', 'admin')
  )
);

-- 4. Criar política adicional para leitura de configurações ativas (mais permissiva)
CREATE POLICY "Any authenticated user can view active config" 
ON system_payment_config 
FOR SELECT
TO authenticated
USING (is_active = true);

-- 5. Log da mudança
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS simplificadas e combinadas!';
  RAISE NOTICE '   - Agora aceita user_type do profile OU role do user_roles';
  RAISE NOTICE '   - Teachers e admins têm acesso total';
  RAISE NOTICE '   - Usuários autenticados podem ver configs ativas';
END $$;