-- Criar bucket para biblioteca de exercícios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biblioteca-exercicios', 
  'biblioteca-exercicios', 
  true, 
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/gif']
);

-- Políticas para upload de vídeos de exercícios
CREATE POLICY "Teachers can upload exercise videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'biblioteca-exercicios' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view exercise videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'biblioteca-exercicios');

CREATE POLICY "Teachers can update own exercise videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'biblioteca-exercicios' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Teachers can delete own exercise videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'biblioteca-exercicios' 
  AND auth.uid() IS NOT NULL
);