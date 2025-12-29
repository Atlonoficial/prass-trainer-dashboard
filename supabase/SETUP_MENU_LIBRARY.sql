-- ===================================================
-- TABELA menu_library
-- Execute no SQL Editor do Supabase
-- ===================================================

CREATE TABLE IF NOT EXISTS public.menu_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  folder_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  file_size INTEGER,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_library_teacher ON public.menu_library(teacher_id);
CREATE INDEX IF NOT EXISTS idx_menu_library_folder ON public.menu_library(folder_name);
ALTER TABLE public.menu_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ml_teacher_all" ON public.menu_library;
CREATE POLICY "ml_teacher_all" ON public.menu_library FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- Verificar
SELECT 'menu_library' as tabela, COUNT(*) as registros FROM public.menu_library;
