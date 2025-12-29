-- Corrigir problema de RLS da tabela backup
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

-- Verificar se o usuário atual tem perfil criado
INSERT INTO public.profiles (id, user_type, name, email)
SELECT 
  auth.uid(),
  'teacher',
  'Professor',
  'geral1atlontech@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
);

-- Criar alguns alunos de exemplo para testar
INSERT INTO public.profiles (id, user_type, name, email) VALUES
  (gen_random_uuid(), 'student', 'Aluno Teste 1', 'aluno1@teste.com'),
  (gen_random_uuid(), 'student', 'Aluno Teste 2', 'aluno2@teste.com'),
  (gen_random_uuid(), 'student', 'Aluno Teste 3', 'aluno3@teste.com')
ON CONFLICT (id) DO NOTHING;

-- Criar registros de estudantes vinculados ao professor atual
INSERT INTO public.students (user_id, teacher_id, name, email, active_plan, membership_status)
SELECT 
  p.id,
  auth.uid(),
  p.name,
  p.email,
  'plano_basico',
  'active'
FROM public.profiles p
WHERE p.user_type = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.user_id = p.id
  )
LIMIT 3;