-- CORREÇÃO DEFINITIVA: Alterar default value de assigned_to
-- Problema: default '{}'::uuid[] causa "malformed array literal" no Supabase JS client
-- Solução: Usar NULL como default

-- 1. Alterar default para NULL
ALTER TABLE workouts 
ALTER COLUMN assigned_to SET DEFAULT NULL;

-- 2. Comentário para documentação
COMMENT ON COLUMN workouts.assigned_to IS 
'Array de IDs de alunos. NULL para templates (uso geral). Default NULL previne erro "malformed array literal" na serialização JavaScript.';