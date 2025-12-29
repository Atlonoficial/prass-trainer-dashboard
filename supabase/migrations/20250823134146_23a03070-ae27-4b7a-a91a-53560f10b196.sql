-- Criar bucket para imagens de módulos se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-modules', 'course-modules', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de storage para course-modules
CREATE POLICY "Anyone can view course module images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'course-modules');

CREATE POLICY "Authenticated users can upload course module images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'course-modules' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own course module images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'course-modules' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own course module images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'course-modules' AND auth.role() = 'authenticated');