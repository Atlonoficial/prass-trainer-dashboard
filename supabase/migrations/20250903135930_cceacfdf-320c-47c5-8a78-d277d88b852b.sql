-- Criar função para verificar se usuário pode inserir notificação
CREATE OR REPLACE FUNCTION public.can_insert_notification(p_user_id uuid, p_target_users uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se o usuário é um professor
  IF NOT public.is_teacher(p_user_id) THEN
    RETURN false;
  END IF;
  
  -- Se não há usuários alvo específicos, permitir (notificação geral)
  IF p_target_users IS NULL OR array_length(p_target_users, 1) IS NULL THEN
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

-- Remover políticas existentes da tabela notifications
DROP POLICY IF EXISTS "Teachers can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Teachers can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Teachers can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view targeted notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON public.notifications;

-- Criar novas políticas RLS para a tabela notifications
CREATE POLICY "Teachers can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_insert_notification(auth.uid(), target_users)
);

CREATE POLICY "Teachers can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR 
  auth.uid() = ANY(target_users) OR
  (target_users IS NULL OR array_length(target_users, 1) IS NULL)
);

CREATE POLICY "Teachers can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Policy para service role (Edge Functions)
CREATE POLICY "Service role can manage notifications"
ON public.notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;