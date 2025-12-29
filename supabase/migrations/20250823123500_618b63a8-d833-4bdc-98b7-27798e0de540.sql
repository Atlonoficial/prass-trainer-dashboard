-- Create storage bucket for course images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-images', 'course-images', true);

-- Create RLS policies for course images
CREATE POLICY "Anyone can view course images" ON storage.objects 
FOR SELECT USING (bucket_id = 'course-images');

CREATE POLICY "Teachers can upload course images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'course-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can update their course images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'course-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can delete their course images" ON storage.objects 
FOR DELETE USING (bucket_id = 'course-images' AND auth.uid() IS NOT NULL);