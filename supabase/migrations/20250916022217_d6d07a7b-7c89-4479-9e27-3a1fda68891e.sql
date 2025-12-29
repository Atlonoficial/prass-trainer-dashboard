-- Adicionar campos necessários na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS role_set_once boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone text;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Comentários para documentar os campos
COMMENT ON COLUMN public.profiles.role IS 'Profissão do usuário - pode ser definida apenas uma vez';
COMMENT ON COLUMN public.profiles.role_set_once IS 'Controla se a profissão já foi definida uma vez';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone do usuário - pode ser alterado a qualquer momento';