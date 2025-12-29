-- Remover a função RPC problemática que causa o erro "malformed array literal"
DROP FUNCTION IF EXISTS public.safe_delete_nutrition_plan(uuid);