-- ============================================
-- MIGRATION: Sistema de Roles Seguro - Estrutura Base
-- ============================================

-- 1. Criar/Recriar enum para roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Criar tabela user_roles
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Criar função security definer para verificar roles (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5. RLS Policy para system_payment_config - Teachers/Admins podem visualizar
DROP POLICY IF EXISTS "Authenticated users can view active payment config" ON public.system_payment_config;
DROP POLICY IF EXISTS "Teachers can view all payment configs" ON public.system_payment_config;

CREATE POLICY "Teachers and admins can view payment config"
ON public.system_payment_config
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 6. Comentários
COMMENT ON TABLE public.user_roles IS 'Armazena roles de usuários de forma segura (segue padrão recomendado Supabase)';
COMMENT ON FUNCTION public.has_role IS 'Função security definer para verificar roles sem recursão em RLS policies';

-- 7. Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Estrutura de roles criada com sucesso!';
  RAISE NOTICE '⚠️  PRÓXIMO PASSO: Popule a tabela user_roles com seus usuários';
  RAISE NOTICE '   Exemplo: INSERT INTO user_roles (user_id, role) VALUES (''uuid-do-professor'', ''teacher'');';
END $$;