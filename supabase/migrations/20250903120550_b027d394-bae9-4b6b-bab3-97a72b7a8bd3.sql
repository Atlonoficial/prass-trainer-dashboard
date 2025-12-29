-- Corrigir apenas o problema crítico de RLS
ALTER TABLE public.gamification_activities_backup ENABLE ROW LEVEL SECURITY;

-- Política simples para a tabela backup
CREATE POLICY "Authenticated users can access backup data"
ON public.gamification_activities_backup
FOR ALL
TO authenticated
USING (true);

-- Atualizar ou criar perfil para o usuário atual (se ele estiver logado)
INSERT INTO public.profiles (id, user_type, name, email)
VALUES ('0d5398c2-278e-4853-b980-f36961795e52', 'teacher', 'Professor Principal', 'geral1atlontech@gmail.com')
ON CONFLICT (id) DO UPDATE SET 
    user_type = 'teacher',
    name = 'Professor Principal',
    email = 'geral1atlontech@gmail.com';