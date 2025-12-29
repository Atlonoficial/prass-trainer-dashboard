-- CORREÇÃO COMPLETA RLS - PARTE 1: LIMPEZA TOTAL
-- Lista e remove todas as políticas existentes da tabela notifications
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Remove todas as políticas existentes na tabela notifications
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy_record.policyname);
    END LOOP;
END $$;

-- Remove todas as funções can_insert_notification existentes
DROP FUNCTION IF EXISTS public.can_insert_notification(uuid, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.can_insert_notification(p_user_id uuid, p_target_users uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.can_insert_notification CASCADE;

-- Cria função RLS limpa e correta
CREATE OR REPLACE FUNCTION public.can_insert_notification(p_user_id uuid, p_target_users uuid[] DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário é um professor
  IF NOT public.is_teacher(p_user_id) THEN
    RETURN false;
  END IF;
  
  -- Se não há usuários alvo específicos, permitir (notificação geral)  
  IF p_target_users IS NULL OR array_length(p_target_users, 1) IS NULL OR p_target_users = '{}' THEN
    RETURN true;
  END IF;
  
  -- Verificar se todos os usuários alvo são estudantes do professor
  RETURN NOT EXISTS (
    SELECT 1 
    FROM unnest(p_target_users) AS target_user_id
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.students s 
      WHERE s.user_id = target_user_id 
        AND s.teacher_id = p_user_id
    )
  );
END;
$$;