-- Remove trigger e função antiga que causam erro no signup
-- Esta função tentava inserir todos os usuários em students com teacher_id fixo

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();

-- Os triggers multi-tenant já existentes vão funcionar:
-- 1. ensure_teacher_tenant (cria tenant automaticamente para professores)
-- 2. auto_assign_tenant_id (herda tenant_id automaticamente)