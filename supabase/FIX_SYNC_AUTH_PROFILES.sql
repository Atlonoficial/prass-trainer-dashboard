-- ==============================================================
-- DIAGNÓSTICO E CORREÇÃO: Sincronizar Auth.Users com Profiles
-- ==============================================================

-- 1. Ver todos os usuários do auth.users
SELECT id, email FROM auth.users ORDER BY created_at DESC;

-- 2. Ver todos os profiles
SELECT id, email, name, user_type FROM profiles ORDER BY created_at DESC;

-- 3. Encontrar usuários SEM profile correspondente
SELECT au.id, au.email, 'SEM PROFILE' as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 4. Encontrar profiles com ID diferente do auth.users (busca por email)
SELECT 
  au.id as auth_id, 
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.user_type,
  'ID DIFERENTE' as status
FROM auth.users au
LEFT JOIN profiles p ON au.email = p.email
WHERE au.id != p.id OR p.id IS NULL;

-- ==============================================================
-- CORREÇÃO: Criar profile para usuario professor.teste@gmail.com
-- ==============================================================

-- 5. Inserir profile com ID correto do auth.users
INSERT INTO profiles (id, email, name, user_type, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'Professor Teste',
  'teacher',
  now(),
  now()
FROM auth.users au
WHERE au.email = 'professor.teste@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
  user_type = 'teacher',
  name = 'Professor Teste',
  email = EXCLUDED.email;

-- 6. Verificar resultado
SELECT id, email, name, user_type FROM profiles WHERE email = 'professor.teste@gmail.com';
