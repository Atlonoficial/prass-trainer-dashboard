-- ============================================
-- MIGRATION: Trigger Automático para Novos Usuários
-- ============================================

-- Criar trigger para auto-criar role quando usuário é criado
CREATE OR REPLACE FUNCTION public.auto_create_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir role padrão baseado no user_type do profile
  IF NEW.user_type IS NOT NULL AND NEW.user_type IN ('teacher', 'admin', 'student') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.user_type::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE LOG 'Role criada automaticamente para user: %, type: %', NEW.id, NEW.user_type;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger em INSERT de profiles
DROP TRIGGER IF EXISTS auto_create_user_role_on_insert ON public.profiles;

CREATE TRIGGER auto_create_user_role_on_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_user_role();

-- Comentário
COMMENT ON FUNCTION public.auto_create_user_role IS 'Cria automaticamente role em user_roles quando novo profile é criado';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger automático criado: novos usuários receberão roles automaticamente';
END $$;