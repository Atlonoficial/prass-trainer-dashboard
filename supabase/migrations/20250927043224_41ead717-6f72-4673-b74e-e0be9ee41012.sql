-- Remover função existente primeiro
DROP FUNCTION IF EXISTS public.validate_transaction_data_enhanced(uuid,uuid,numeric,text,uuid,uuid,uuid);

-- Corrigir função de validação para aceitar plan_catalog_id
CREATE OR REPLACE FUNCTION public.check_item_reference_flexible(
  p_service_pricing_id UUID,
  p_plan_catalog_id UUID,
  p_course_id UUID,
  p_item_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para serviços (planos), verificar se plan_catalog_id existe
  IF p_item_type = 'service' AND p_plan_catalog_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM plan_catalog pc 
      WHERE pc.id = p_plan_catalog_id AND pc.is_active = true
    );
  END IF;
  
  -- Para cursos, verificar se course_id existe
  IF p_item_type = 'course' AND p_course_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = p_course_id AND c.is_published = true
    );
  END IF;
  
  -- Para service_pricing (legacy), verificar se existe
  IF p_item_type = 'service_pricing' AND p_service_pricing_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM service_pricing sp 
      WHERE sp.id = p_service_pricing_id
    );
  END IF;
  
  -- Se chegou até aqui, pelo menos um dos IDs deve estar presente
  RETURN COALESCE(p_service_pricing_id, p_plan_catalog_id, p_course_id) IS NOT NULL;
END;
$$;

-- Criar tabela para controle de acesso a funcionalidades baseado em planos
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES plan_catalog(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_usage INTEGER, -- NULL = ilimitado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- Habilitar RLS na tabela plan_features
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Política para teachers gerenciarem features dos seus planos
CREATE POLICY "Teachers can manage own plan features" ON public.plan_features
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM plan_catalog pc 
    WHERE pc.id = plan_features.plan_id AND pc.teacher_id = auth.uid()
  )
);

-- Política para students visualizarem features dos planos disponíveis
CREATE POLICY "Students can view available plan features" ON public.plan_features
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM plan_catalog pc 
    JOIN students s ON s.teacher_id = pc.teacher_id 
    WHERE pc.id = plan_features.plan_id AND s.user_id = auth.uid() AND pc.is_active = true
  )
);

-- Função para verificar se usuário tem acesso a uma funcionalidade
CREATE OR REPLACE FUNCTION public.user_has_feature_access(
  p_user_id UUID,
  p_feature_key TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN := false;
BEGIN
  -- Verificar se o usuário tem uma assinatura ativa com a funcionalidade
  SELECT EXISTS (
    SELECT 1 
    FROM plan_subscriptions ps
    JOIN plan_catalog pc ON pc.id = ps.plan_id
    JOIN plan_features pf ON pf.plan_id = pc.id
    WHERE ps.student_user_id = p_user_id
      AND ps.status = 'active'
      AND pf.feature_key = p_feature_key
      AND pf.is_enabled = true
      AND (ps.end_at IS NULL OR ps.end_at > now())
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- Trigger para atualizar updated_at na tabela plan_features
CREATE OR REPLACE FUNCTION public.update_plan_features_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_plan_features_updated_at_trigger
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plan_features_updated_at();

-- Recriar função de validação melhorada
CREATE OR REPLACE FUNCTION public.validate_transaction_data_enhanced(
  p_teacher_id UUID,
  p_student_id UUID,
  p_amount NUMERIC,
  p_item_type TEXT,
  p_service_pricing_id UUID DEFAULT NULL,
  p_plan_catalog_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_teacher_exists BOOLEAN := false;
  v_student_exists BOOLEAN := false;
  v_relationship_exists BOOLEAN := false;
  v_item_exists BOOLEAN := false;
  v_amount_valid BOOLEAN := false;
BEGIN
  -- Validar se teacher existe
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_teacher_id AND user_type = 'teacher'
  ) INTO v_teacher_exists;
  
  -- Validar se student existe
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_student_id
  ) INTO v_student_exists;
  
  -- Validar relacionamento teacher-student (permitir auto-purchase para teachers)
  IF p_teacher_id = p_student_id THEN
    v_relationship_exists := v_teacher_exists; -- Teacher comprando para si mesmo
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM students WHERE user_id = p_student_id AND teacher_id = p_teacher_id
    ) INTO v_relationship_exists;
  END IF;
  
  -- Validar item baseado no tipo
  v_item_exists := public.check_item_reference_flexible(
    p_service_pricing_id, p_plan_catalog_id, p_course_id, p_item_type
  );
  
  -- Validar valor
  v_amount_valid := (p_amount > 0 AND p_amount <= 10000);
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'valid', v_teacher_exists AND v_student_exists AND v_relationship_exists AND v_item_exists AND v_amount_valid,
    'teacher_exists', v_teacher_exists,
    'student_exists', v_student_exists,
    'relationship_valid', v_relationship_exists,
    'item_exists', v_item_exists,
    'amount_valid', v_amount_valid,
    'auto_purchase', p_teacher_id = p_student_id
  );
  
  RETURN v_result;
END;
$$;