-- ===================================================
-- TABELA recent_items_history
-- Execute no SQL Editor do Supabase
-- ===================================================

CREATE TABLE IF NOT EXISTS public.recent_items_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_items_user ON public.recent_items_history(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_items_used_at ON public.recent_items_history(used_at DESC);
ALTER TABLE public.recent_items_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rih_user_all" ON public.recent_items_history;
CREATE POLICY "rih_user_all" ON public.recent_items_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verificar
SELECT 'recent_items_history' as tabela, COUNT(*) as registros FROM public.recent_items_history;
