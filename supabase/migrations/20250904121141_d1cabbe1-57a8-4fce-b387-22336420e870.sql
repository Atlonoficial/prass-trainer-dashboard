-- Corrigir/recriar função can_insert_notification
DROP FUNCTION IF EXISTS public.can_insert_notification(uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.can_insert_notification(p_user_id uuid, p_target_users uuid[] DEFAULT NULL::uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário é um professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND user_type = 'teacher'
  ) THEN
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