-- CORREÇÃO DEFINITIVA: Remover função RPC problemática que causa erro "malformed array literal"
DROP FUNCTION IF EXISTS public.safe_delete_workout(uuid);