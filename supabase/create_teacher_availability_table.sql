-- ===================================================
-- CRIAR TABELA: teacher_availability
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- ===================================================

-- 1. Criar a tabela teacher_availability (se não existir)
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Domingo, 6=Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 2. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id 
  ON public.teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_weekday 
  ON public.teacher_availability(weekday);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Teachers can view own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can insert own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can update own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teachers can delete own availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "Students can view teacher availability" ON public.teacher_availability;

-- 5. Criar novas políticas RLS
-- Professores podem ver sua própria disponibilidade
CREATE POLICY "Teachers can view own availability"
ON public.teacher_availability
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- Professores podem inserir sua própria disponibilidade
CREATE POLICY "Teachers can insert own availability"
ON public.teacher_availability
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- Professores podem atualizar sua própria disponibilidade
CREATE POLICY "Teachers can update own availability"
ON public.teacher_availability
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Professores podem excluir sua própria disponibilidade
CREATE POLICY "Teachers can delete own availability"
ON public.teacher_availability
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Alunos podem ver a disponibilidade do professor deles
CREATE POLICY "Students can view teacher availability"
ON public.teacher_availability
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = teacher_availability.teacher_id
    AND s.user_id = auth.uid()
  )
);

-- 6. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_teacher_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_availability_updated_at ON public.teacher_availability;
CREATE TRIGGER update_teacher_availability_updated_at
  BEFORE UPDATE ON public.teacher_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_availability_updated_at();

-- 7. Habilitar realtime
ALTER TABLE public.teacher_availability REPLICA IDENTITY FULL;

-- Tentar adicionar à publicação (pode dar erro se já existir)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_availability;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Tabela já está na publicação
END $$;

-- ===================================================
-- CRIAR TABELA: teacher_booking_settings (se não existir)
-- ===================================================

CREATE TABLE IF NOT EXISTS public.teacher_booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  minimum_advance_minutes INTEGER NOT NULL DEFAULT 120, -- 2 horas em minutos
  visibility_days INTEGER NOT NULL DEFAULT 7,
  allow_same_day BOOLEAN NOT NULL DEFAULT false,
  auto_confirm BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para teacher_booking_settings
ALTER TABLE public.teacher_booking_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Teachers can manage own booking settings" ON public.teacher_booking_settings;
DROP POLICY IF EXISTS "Students can view teacher booking settings" ON public.teacher_booking_settings;

-- Professores podem gerenciar suas próprias configurações
CREATE POLICY "Teachers can manage own booking settings"
ON public.teacher_booking_settings
FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Alunos podem ver as configurações do professor deles
CREATE POLICY "Students can view teacher booking settings"
ON public.teacher_booking_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.teacher_id = teacher_booking_settings.teacher_id
    AND s.user_id = auth.uid()
  )
);

-- 8. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_teacher_booking_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_booking_settings_updated_at ON public.teacher_booking_settings;
CREATE TRIGGER update_teacher_booking_settings_updated_at
  BEFORE UPDATE ON public.teacher_booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_booking_settings_updated_at();

-- ===================================================
-- VERIFICAÇÃO
-- ===================================================
SELECT 
  'teacher_availability' as table_name,
  COUNT(*) as row_count
FROM public.teacher_availability
UNION ALL
SELECT 
  'teacher_booking_settings' as table_name,
  COUNT(*) as row_count
FROM public.teacher_booking_settings;

-- ===================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/vrzmfhwzoeutokzyypwv/sql/new
-- 2. Cole este script e execute
-- 3. Atualize a página do dashboard
-- ===================================================
