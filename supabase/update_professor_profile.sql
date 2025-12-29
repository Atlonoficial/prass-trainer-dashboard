-- ===================================================
-- ATUALIZAR USUÁRIO PROFESSOR EXISTENTE
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- Atualizar perfil para completar o setup
UPDATE public.profiles
SET 
  user_type = 'teacher',
  profile_complete = true,
  name = COALESCE(name, 'Prass Trainer 2026'),
  updated_at = NOW()
WHERE email = 'prasstrainer2026@prasstrainer.local';

-- Verificar se atualizou
SELECT id, email, name, user_type, profile_complete
FROM public.profiles
WHERE email = 'prasstrainer2026@prasstrainer.local';

-- ===================================================
-- CREDENCIAIS:
-- Usuário: prasstrainer2026
-- Senha: prasstrainer
-- ===================================================
