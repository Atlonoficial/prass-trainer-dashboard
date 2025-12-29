-- Criar bucket para banners de marketing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-banners', 
  'marketing-banners', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Política de UPLOAD (apenas usuários autenticados)
CREATE POLICY "Authenticated users can upload marketing banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketing-banners'
);

-- Política de VISUALIZAÇÃO (público)
CREATE POLICY "Anyone can view marketing banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-banners');

-- Política de ATUALIZAÇÃO (apenas criador)
CREATE POLICY "Users can update own marketing banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-banners' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'marketing-banners');

-- Política de DELETE (apenas criador)
CREATE POLICY "Users can delete own marketing banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-banners' AND auth.uid() = owner);