-- ============================================
-- SCRIPT 2: Colunas push_token na tabela profiles
-- Execute DEPOIS de criar a tabela notifications
-- ============================================

-- Adicionar coluna push_token
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Adicionar coluna de última atualização do token
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna de plataforma
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS platform VARCHAR(20);

SELECT 'Colunas push_token adicionadas com sucesso!' as status;
