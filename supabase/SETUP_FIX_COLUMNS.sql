-- ===================================================
-- SCRIPT FINAL CONSOLIDADO - CORREÇÕES DE ESTRUTURA
-- Execute no SQL Editor do Supabase
-- ===================================================

-- Adicionar colunas faltantes na tabela students se necessário
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Adicionar colunas faltantes na tabela profiles se necessário
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'student';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Adicionar colunas faltantes na tabela progress
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'weight';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS value NUMERIC DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Adicionar colunas faltantes na tabela feedbacks
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS teacher_id UUID;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS rating INTEGER;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Verificar estrutura das tabelas principais
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('students', 'profiles', 'progress', 'feedbacks')
ORDER BY table_name, ordinal_position;
