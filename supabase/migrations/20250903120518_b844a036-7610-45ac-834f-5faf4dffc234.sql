-- Habilitar RLS na tabela backup que estava causando o erro de segurança
ALTER TABLE public.gamification_activities_backup ENABLE ROW LEVEL SECURITY;

-- Criar política simples para a tabela backup
CREATE POLICY "Teachers can access backup data"
ON public.gamification_activities_backup
FOR ALL
TO authenticated
USING (true);

-- Primeiro, verificar se existe o usuário específico nos profiles
DO $$
BEGIN
    -- Criar perfil do professor se não existir
    INSERT INTO public.profiles (id, user_type, name, email)
    VALUES ('0d5398c2-278e-4853-b980-f36961795e52', 'teacher', 'Professor Principal', 'geral1atlontech@gmail.com')
    ON CONFLICT (id) DO UPDATE SET 
        user_type = 'teacher',
        name = 'Professor Principal',
        email = 'geral1atlontech@gmail.com';
        
    -- Criar alguns perfis de alunos de exemplo
    INSERT INTO public.profiles (id, user_type, name, email) VALUES
        ('11111111-1111-1111-1111-111111111111', 'student', 'João Silva', 'joao@exemplo.com'),
        ('22222222-2222-2222-2222-222222222222', 'student', 'Maria Santos', 'maria@exemplo.com'),
        ('33333333-3333-3333-3333-333333333333', 'student', 'Pedro Costa', 'pedro@exemplo.com')
    ON CONFLICT (id) DO NOTHING;
    
    -- Criar registros de students vinculados ao professor
    INSERT INTO public.students (user_id, teacher_id, name, email, active_plan, membership_status) VALUES
        ('11111111-1111-1111-1111-111111111111', '0d5398c2-278e-4853-b980-f36961795e52', 'João Silva', 'joao@exemplo.com', 'plano_premium', 'active'),
        ('22222222-2222-2222-2222-222222222222', '0d5398c2-278e-4853-b980-f36961795e52', 'Maria Santos', 'maria@exemplo.com', 'plano_basico', 'active'),
        ('33333333-3333-3333-3333-333333333333', '0d5398c2-278e-4853-b980-f36961795e52', 'Pedro Costa', 'pedro@exemplo.com', 'plano_premium', 'trial')
    ON CONFLICT (user_id, teacher_id) DO NOTHING;
    
END $$;