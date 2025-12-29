-- CORREÇÃO COMPLETA RLS - PARTE 2: IMPLEMENTAÇÃO DAS POLÍTICAS
-- Cria todas as políticas RLS necessárias para o funcionamento correto do OneSignal

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