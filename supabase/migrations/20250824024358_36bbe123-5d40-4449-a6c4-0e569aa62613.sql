-- Corrigir módulos existentes que deveriam estar publicados
UPDATE course_modules 
SET is_published = true 
WHERE is_published = false 
  AND EXISTS (
    SELECT 1 FROM course_lessons 
    WHERE course_lessons.module_id = course_modules.id 
      AND course_lessons.is_published = true
  );

-- Comentário: Esta query publica automaticamente módulos que têm pelo menos uma aula publicada,
-- corrigindo o problema onde módulos ficam despublicados mesmo tendo conteúdo pronto