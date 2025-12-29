-- Atualizar política RLS para mostrar todos os cursos publicados para alunos
DROP POLICY "Users can view published free or enrolled courses" ON public.courses;

CREATE POLICY "Users can view all published courses" 
ON public.courses 
FOR SELECT 
TO authenticated 
USING (is_published = true);

-- Manter política separada para professores verem seus próprios cursos (inclusive não publicados)
-- Política "Teachers can view own courses" já existe e cobre esse caso