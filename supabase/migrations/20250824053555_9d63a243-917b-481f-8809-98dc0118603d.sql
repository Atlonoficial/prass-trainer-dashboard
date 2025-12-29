-- FASE 1: Correção da Política RLS para nutrition_plans
-- Dropar a política INSERT atual que está muito permissiva
DROP POLICY IF EXISTS "Teachers can create nutrition plans" ON public.nutrition_plans;

-- Criar nova política INSERT mais restritiva que verifica se o usuário é professor
CREATE POLICY "Teachers can create nutrition plans" 
ON public.nutrition_plans 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.user_type = 'teacher'
  )
);

-- Verificar se precisamos de uma função helper para evitar recursão
CREATE OR REPLACE FUNCTION public.is_teacher(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND user_type = 'teacher'
  );
$$;

-- Atualizar a política INSERT para usar a função helper
DROP POLICY IF EXISTS "Teachers can create nutrition plans" ON public.nutrition_plans;
CREATE POLICY "Teachers can create nutrition plans" 
ON public.nutrition_plans 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_teacher(auth.uid()));