-- Verificar e criar bucket de storage para exercícios se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca-exercicios', 'biblioteca-exercicios', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de storage para o bucket biblioteca-exercicios
CREATE POLICY "Teachers can upload exercise videos"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'biblioteca-exercicios' 
  AND auth.role() = 'authenticated'
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
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can delete own exercise videos"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'biblioteca-exercicios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);