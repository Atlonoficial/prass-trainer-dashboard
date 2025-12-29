-- Converter coluna specialties de ARRAY para TEXT
-- Preserva dados existentes pegando o primeiro elemento do array

ALTER TABLE public.profiles 
ALTER COLUMN specialties TYPE TEXT 
USING CASE 
  WHEN specialties IS NULL THEN NULL
  WHEN array_length(specialties, 1) > 0 THEN specialties[1]
  ELSE NULL
END;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.profiles.specialties IS 'Especialidades do professor (formato texto)';