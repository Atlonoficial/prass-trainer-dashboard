-- Criar bucket para capas de módulos dos cursos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-module-covers', 
  'course-module-covers', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Política para permitir que professores vejam todas as capas
CREATE POLICY "Anyone can view module covers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-module-covers');

-- Política para permitir que professores façam upload de capas
CREATE POLICY "Teachers can upload module covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-module-covers' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir que professores atualizem suas próprias capas
CREATE POLICY "Teachers can update their module covers" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-module-covers' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir que professores deletem suas próprias capas
CREATE POLICY "Teachers can delete their module covers" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-module-covers' 
  AND auth.role() = 'authenticated'
);