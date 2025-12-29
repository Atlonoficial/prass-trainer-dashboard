-- Políticas RLS para o bucket banner-images

-- Política para permitir que usuários vejam banners públicos
CREATE POLICY "Banner images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'banner-images');

-- Política para permitir que teachers criem/façam upload de imagens de banner
CREATE POLICY "Teachers can upload banner images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'banner-images' AND auth.role() = 'authenticated');

-- Política para permitir que teachers atualizem suas próprias imagens de banner
CREATE POLICY "Teachers can update banner images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');

-- Política para permitir que teachers deletem suas próprias imagens de banner
CREATE POLICY "Teachers can delete banner images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'banner-images' AND auth.role() = 'authenticated');