-- Adicionar colunas faltantes para perfil de professor
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS academy_name TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.academy_name IS 'Nome da academia do professor';
COMMENT ON COLUMN public.profiles.specialties IS 'Especialidades do professor';
COMMENT ON COLUMN public.profiles.bio IS 'Biografia do professor';