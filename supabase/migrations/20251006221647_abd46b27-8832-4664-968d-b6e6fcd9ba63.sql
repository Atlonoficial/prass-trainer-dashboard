-- 1. Adicionar campo default_teacher_id em tenants (permitir NULL inicialmente)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS default_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tenants_default_teacher 
ON tenants(default_teacher_id);

-- 2. Configurar tenant Shape Pro (sem professor por enquanto)
UPDATE tenants 
SET 
  slug = 'shapepro',
  domain = 'shapepro.site'
WHERE id = '226642e7-d962-49f0-a840-bda4af907115';

-- 3. Criar função para buscar tenant por domínio
CREATE OR REPLACE FUNCTION get_tenant_by_domain(p_domain text)
RETURNS TABLE(
  tenant_id uuid,
  tenant_slug text,
  default_teacher_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as tenant_id,
    slug as tenant_slug,
    default_teacher_id
  FROM tenants 
  WHERE domain = p_domain 
     OR domain = 'www.' || p_domain
     OR 'www.' || domain = p_domain
  LIMIT 1;
$$;

-- 4. Criar função para auto-vincular aluno ao professor padrão
CREATE OR REPLACE FUNCTION auto_link_student_to_default_teacher()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_default_teacher_id UUID;
BEGIN
  -- Buscar tenant_id do novo usuário
  v_tenant_id := NEW.tenant_id;
  
  -- Se não tiver tenant_id, não fazer nada
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE '[AUTO_LINK] Usuário % sem tenant_id, pulando auto-link', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Se for professor, não vincular
  IF NEW.user_type = 'teacher' THEN
    RAISE NOTICE '[AUTO_LINK] Usuário % é professor, pulando auto-link', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Buscar professor padrão do tenant
  SELECT default_teacher_id INTO v_default_teacher_id
  FROM tenants
  WHERE id = v_tenant_id;
  
  -- Se não tiver professor padrão, não fazer nada
  IF v_default_teacher_id IS NULL THEN
    RAISE NOTICE '[AUTO_LINK] Tenant % sem professor padrão configurado, pulando auto-link', v_tenant_id;
    RETURN NEW;
  END IF;
  
  -- Vincular aluno ao professor padrão
  INSERT INTO students (user_id, teacher_id, tenant_id, status)
  VALUES (NEW.id, v_default_teacher_id, v_tenant_id, 'active')
  ON CONFLICT (user_id, teacher_id) DO NOTHING;
  
  RAISE NOTICE '[AUTO_LINK] ✅ Aluno % vinculado automaticamente ao professor padrão %', NEW.id, v_default_teacher_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar trigger para auto-vincular após criar profile
DROP TRIGGER IF EXISTS trigger_auto_link_student ON profiles;

CREATE TRIGGER trigger_auto_link_student
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.user_type IS NULL OR NEW.user_type = 'student')
  EXECUTE FUNCTION auto_link_student_to_default_teacher();