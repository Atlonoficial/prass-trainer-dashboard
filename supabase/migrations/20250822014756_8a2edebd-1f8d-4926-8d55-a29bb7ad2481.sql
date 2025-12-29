-- Remover função de teste e dados de teste
DROP FUNCTION IF EXISTS public.test_banner_interaction(uuid, uuid, text, jsonb);

-- Limpar dados de teste existentes
DELETE FROM public.banner_interactions WHERE metadata->>'test' = 'true';

-- Configurar tabelas para Realtime
ALTER TABLE public.banner_interactions REPLICA IDENTITY FULL;
ALTER TABLE public.banner_analytics REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.banner_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banner_analytics;