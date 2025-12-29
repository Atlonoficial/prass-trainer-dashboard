-- ==============================================================
-- TRIGGER: Vincular Automaticamente Alunos ao Cadastrar no App
-- ==============================================================
-- Este trigger é executado quando um novo usuário é criado no auth.users
-- Ele verifica se existe um registro em 'students' com o mesmo email
-- e vincula o user_id automaticamente (dupla camada de segurança)
-- ==============================================================

-- 1. Função que faz a vinculação automática
CREATE OR REPLACE FUNCTION public.link_student_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Log para debug
    RAISE LOG 'link_student_on_signup: Novo usuário criado - ID: %, Email: %', NEW.id, NEW.email;
    
    -- Vincular user_id ao registro existente em students (se houver)
    UPDATE public.students
    SET user_id = NEW.id,
        updated_at = now()
    WHERE email = lower(NEW.email)
      AND user_id IS NULL;
    
    -- Se não encontrou registro do professor, criar com plano gratuito
    IF NOT FOUND THEN
        RAISE LOG 'link_student_on_signup: Nenhum registro encontrado, criando aluno com plano free';
        
        INSERT INTO public.students (
            user_id,
            name,
            email,
            active_plan,
            membership_status,
            mode,
            goals,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Aluno'),
            lower(NEW.email),
            'free',
            'active',
            'Online',
            ARRAY['ficar_em_forma'],
            now(),
            now()
        )
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        RAISE LOG 'link_student_on_signup: Aluno vinculado ao registro do professor';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger que dispara após inserção de novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    WHEN (NEW.raw_user_meta_data->>'user_type' = 'student')
    EXECUTE FUNCTION public.link_student_on_signup();

-- 3. Garantir permissões corretas
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON public.students TO postgres, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.students TO anon;

-- 4. Verificar se a coluna email existe na tabela students
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.students ADD COLUMN email text;
    END IF;
END $$;

-- 5. Criar índice para busca rápida por email
DROP INDEX IF EXISTS idx_students_email_null_user;
CREATE INDEX idx_students_email_null_user ON public.students (email) WHERE user_id IS NULL;

-- ==============================================================
-- RESULTADO ESPERADO:
-- Quando um aluno se cadastra no app:
-- 1. O Supabase Auth cria o usuário em auth.users
-- 2. Este trigger dispara e:
--    a) SE o professor já cadastrou o email -> vincula user_id
--    b) SE não existe registro -> cria com plano 'free'
-- ==============================================================
