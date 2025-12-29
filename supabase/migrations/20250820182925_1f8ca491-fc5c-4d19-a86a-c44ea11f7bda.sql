-- Create storage bucket for reward images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rewards', 'rewards', true);

-- Create policies for reward images
CREATE POLICY "Reward images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'rewards');

CREATE POLICY "Teachers can upload reward images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'rewards' AND auth.role() = 'authenticated');

CREATE POLICY "Teachers can update reward images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'rewards' AND auth.role() = 'authenticated');

CREATE POLICY "Teachers can delete reward images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'rewards' AND auth.role() = 'authenticated');