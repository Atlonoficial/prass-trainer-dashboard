-- Habilitar RLS na tabela backup que estava sem proteção
ALTER TABLE public.gamification_activities_backup ENABLE ROW LEVEL SECURITY;

-- Criar política para a tabela backup (somente professores podem acessar)
CREATE POLICY "Only teachers can access backup data"
ON public.gamification_activities_backup
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.user_type = 'teacher'
  )
);

-- Verificar se existe função is_teacher_of para relacionamentos professor-aluno
CREATE OR REPLACE FUNCTION public.is_teacher_of(teacher_id uuid, student_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = teacher_id 
    AND s.user_id = student_user_id
  );
$$;