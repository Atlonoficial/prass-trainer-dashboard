-- CORREÇÃO COMPLETA RLS E ONESIGNAL NOTIFICATIONS
-- Remove todas as políticas RLS existentes da tabela notifications
DROP POLICY IF EXISTS "Users can insert notifications for self or their students" ON public.notifications;
DROP POLICY IF EXISTS "Teachers can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Teachers can manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view targeted notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Students can view teacher notifications" ON public.notifications;

-- Remove funções duplicadas ou conflitantes
DROP FUNCTION IF EXISTS public.can_insert_notification(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.can_insert_notification(p_user_id uuid, p_target_users uuid[]);

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

-- Implementa políticas RLS limpas e corretas
-- Política 1: Professores podem criar notificações para seus alunos
CREATE POLICY "Teachers can create notifications for students"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND public.can_insert_notification(auth.uid(), target_users)
);

-- Política 2: Professores podem ver suas próprias notificações
CREATE POLICY "Teachers can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Política 3: Alunos podem ver notificações direcionadas a eles
CREATE POLICY "Students can view targeted notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  -- Notificações gerais (sem target_users específicos)
  (target_users IS NULL OR target_users = '{}')
  OR
  -- Notificações direcionadas especificamente ao usuário
  (auth.uid() = ANY(target_users))
  OR
  -- Notificações do professor do aluno (se aluno)
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() 
    AND s.teacher_id = notifications.created_by
  )
);

-- Política 4: Professores podem atualizar suas notificações
CREATE POLICY "Teachers can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Política 5: Professores podem deletar suas notificações
CREATE POLICY "Teachers can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Garante que RLS está habilitado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;