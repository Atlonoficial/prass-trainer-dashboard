-- ===================================================
-- CRIAR USUÁRIO PROFESSOR: prasstrainer2026
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- 1. Criar o usuário na tabela auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'prasstrainer2026@prasstrainer.local',
  crypt('prasstrainer', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"user_type": "teacher", "name": "Prass Trainer 2026"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
)
RETURNING id, email;

-- 2. Criar o perfil do professor com name obrigatório
INSERT INTO public.profiles (
  id,
  email,
  name,
  user_type,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  'Prass Trainer 2026',
  'teacher',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'prasstrainer2026@prasstrainer.local'
ON CONFLICT (id) DO UPDATE SET
  name = 'Prass Trainer 2026',
  user_type = 'teacher',
  updated_at = NOW();

-- ===================================================
-- CREDENCIAIS DE ACESSO:
-- Usuário: prasstrainer2026
-- Senha: prasstrainer
-- ===================================================
