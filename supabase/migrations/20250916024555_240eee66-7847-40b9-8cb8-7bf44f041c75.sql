-- FASE 2: Criar foreign key entre students.user_id e profiles.id
-- Isso vai permitir joins otimizados e resolver os problemas de relacionamento

-- Primeiro, verificar se não há dados órfãos
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Contar registros em students que não têm profile correspondente
  SELECT COUNT(*) INTO orphan_count
  FROM students s
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = s.user_id
  );
  
  IF orphan_count > 0 THEN
    RAISE WARNING 'Encontrados % registros órfãos em students sem profile correspondente', orphan_count;
    
    -- Opcional: Criar profiles para usuarios órfãos ou remover registros órfãos
    -- Por segurança, vamos só avisar e não remover automaticamente
  END IF;
END $$;

-- Adicionar foreign key constraint
ALTER TABLE public.students 
ADD CONSTRAINT fk_students_user_id_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Criar índice para otimizar joins
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

-- Adicionar comentário para documentação
COMMENT ON CONSTRAINT fk_students_user_id_profiles ON public.students IS 
'Foreign key constraint linking students to their profile data';

-- Verificar se a constraint foi criada com sucesso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_students_user_id_profiles' 
    AND table_name = 'students'
  ) THEN
    RAISE NOTICE 'Foreign key constraint criada com sucesso!';
  ELSE
    RAISE EXCEPTION 'Falha ao criar foreign key constraint';
  END IF;
END $$;