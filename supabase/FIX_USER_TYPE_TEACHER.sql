-- ==============================================================
-- CORREÇÃO: Definir usuário como Professor
-- ==============================================================

-- 1. Atualizar o tipo de usuário para 'teacher'
UPDATE profiles 
SET user_type = 'teacher',
    updated_at = now()
WHERE email = 'prasstrainer2026@prasstrainer.local';

-- 2. Verificar se a atualização foi bem-sucedida
SELECT id, email, name, user_type, created_at, updated_at
FROM profiles 
WHERE email = 'prasstrainer2026@prasstrainer.local';

-- ==============================================================
-- APÓS EXECUTAR:
-- 1. Faça logout no Dashboard
-- 2. Faça login novamente
-- 3. O Dashboard deve mostrar a visão de professor
-- ==============================================================
