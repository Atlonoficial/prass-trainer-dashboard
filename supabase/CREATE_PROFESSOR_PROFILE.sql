-- ==============================================================
-- CRIAR PERFIL DE PROFESSOR MANUALMENTE
-- ==============================================================

-- 1. Primeiro, buscar o ID do usuário no auth.users
-- Execute esta query e copie o ID retornado
SELECT id, email, created_at
FROM auth.users 
WHERE email = 'professor@teste.com';

-- 2. Depois, inserir o perfil na tabela profiles
-- SUBSTITUA 'ID_DO_USUARIO_AQUI' pelo ID retornado acima
INSERT INTO profiles (id, email, name, user_type, created_at, updated_at)
SELECT 
  id,
  email,
  'Professor Teste',
  'teacher',
  now(),
  now()
FROM auth.users 
WHERE email = 'professor@teste.com'
ON CONFLICT (id) DO UPDATE 
SET user_type = 'teacher',
    name = 'Professor Teste',
    updated_at = now();

-- 3. Verificar se o perfil foi criado
SELECT id, email, name, user_type 
FROM profiles 
WHERE email = 'professor@teste.com';

-- ==============================================================
-- APÓS EXECUTAR:
-- 1. Tente fazer login novamente no Dashboard
-- 2. Use: professor@teste.com / 654321
-- ==============================================================
