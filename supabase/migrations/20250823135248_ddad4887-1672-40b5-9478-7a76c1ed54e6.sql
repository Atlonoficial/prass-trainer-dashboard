-- Add release control fields to course_modules table
ALTER TABLE public.course_modules 
ADD COLUMN release_mode text NOT NULL DEFAULT 'immediate' CHECK (release_mode IN ('immediate', 'days_after_enrollment')),
ADD COLUMN release_after_days integer NULL DEFAULT NULL,
ADD COLUMN cover_image_url text NULL;

-- Add release control fields to course_lessons table  
ALTER TABLE public.course_lessons 
ADD COLUMN release_mode text NOT NULL DEFAULT 'immediate' CHECK (release_mode IN ('immediate', 'days_after_enrollment')),
ADD COLUMN release_after_days integer NULL DEFAULT NULL;

-- Add validation trigger for release_after_days
CREATE OR REPLACE FUNCTION validate_release_days()
RETURNS TRIGGER AS $$
BEGIN
  -- If release_mode is 'days_after_enrollment', release_after_days must be set
  IF NEW.release_mode = 'days_after_enrollment' AND NEW.release_after_days IS NULL THEN
    RAISE EXCEPTION 'release_after_days deve ser especificado quando release_mode é days_after_enrollment';
  END IF;
  
  -- If release_mode is 'immediate', release_after_days should be null
  IF NEW.release_mode = 'immediate' THEN
    NEW.release_after_days := NULL;
  END IF;
  
  -- Validate release_after_days is positive
  IF NEW.release_after_days IS NOT NULL AND NEW.release_after_days < 0 THEN
    RAISE EXCEPTION 'release_after_days deve ser um número positivo';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
CREATE TRIGGER validate_module_release_days
  BEFORE INSERT OR UPDATE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION validate_release_days();

CREATE TRIGGER validate_lesson_release_days
  BEFORE INSERT OR UPDATE ON public.course_lessons  
  FOR EACH ROW
  EXECUTE FUNCTION validate_release_days();

-- Comment the new columns
COMMENT ON COLUMN public.course_modules.release_mode IS 'Como o módulo será liberado: immediate (imediato) ou days_after_enrollment (após X dias da matrícula)';
COMMENT ON COLUMN public.course_modules.release_after_days IS 'Número de dias após a matrícula para liberar o módulo (usado apenas se release_mode = days_after_enrollment)';
COMMENT ON COLUMN public.course_modules.cover_image_url IS 'URL da imagem de capa do módulo';

COMMENT ON COLUMN public.course_lessons.release_mode IS 'Como a aula será liberada: immediate (imediato) ou days_after_enrollment (após X dias da matrícula)';
COMMENT ON COLUMN public.course_lessons.release_after_days IS 'Número de dias após a matrícula para liberar a aula (usado apenas se release_mode = days_after_enrollment)';