-- Criar função para inserir dados de teste e bypassar RLS temporariamente
CREATE OR REPLACE FUNCTION public.test_banner_interaction(
  p_banner_id UUID,
  p_user_id UUID,
  p_interaction_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  interaction_id UUID;
BEGIN
  -- Inserir interação diretamente (bypassando RLS para teste)
  INSERT INTO public.banner_interactions (
    banner_id,
    user_id,
    interaction_type,
    metadata,
    session_id
  ) VALUES (
    p_banner_id,
    p_user_id,
    p_interaction_type,
    p_metadata || jsonb_build_object('test', true, 'timestamp', NOW()),
    'test-session-' || extract(epoch from NOW())
  ) RETURNING id INTO interaction_id;
  
  RAISE NOTICE 'Test interaction inserted: % for banner: % user: %', interaction_id, p_banner_id, p_user_id;
  
  RETURN interaction_id;
END;
$$;