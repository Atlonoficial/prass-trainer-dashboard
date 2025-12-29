-- CORREÇÃO: Função de auto-vinculação de alunos ao professor padrão
-- Problema: Tentava usar coluna 'status' que não existe, deveria ser 'membership_status'

CREATE OR REPLACE FUNCTION public.auto_link_student_to_default_teacher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  BEGIN
    INSERT INTO students (user_id, teacher_id, tenant_id, membership_status)
    VALUES (NEW.id, v_default_teacher_id, v_tenant_id, 'active')
    ON CONFLICT (user_id) DO UPDATE 
    SET teacher_id = EXCLUDED.teacher_id,
        tenant_id = EXCLUDED.tenant_id,
        membership_status = EXCLUDED.membership_status,
        updated_at = NOW();
    
    RAISE NOTICE '[AUTO_LINK] ✅ Aluno % vinculado automaticamente ao professor padrão %', NEW.id, v_default_teacher_id;
  EXCEPTION WHEN OTHERS THEN
    -- Lançar exceção para não silenciar erros
    RAISE EXCEPTION '[AUTO_LINK] ❌ Erro ao vincular aluno %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Vincular manualmente o aluno órfão (Natã Eric Wolff)
INSERT INTO students (user_id, teacher_id, tenant_id, membership_status)
VALUES (
  '1adbd8ee-fc70-46d4-9187-ad69b523eb11',
  '2db424b4-08d2-4ad0-9dd0-971eaab960e1',
  'e3891432-685d-4d22-bcfb-8d26f7d28d56',
  'active'
)
ON CONFLICT (user_id) DO UPDATE
SET teacher_id = EXCLUDED.teacher_id,
    tenant_id = EXCLUDED.tenant_id,
    membership_status = EXCLUDED.membership_status,
    updated_at = NOW();