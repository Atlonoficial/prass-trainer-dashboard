-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for course materials
CREATE POLICY "Teachers can upload course materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can view their course materials" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can update their course materials" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can delete their course materials" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create course_materials table to store course material metadata
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_downloadable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for course_materials
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage course materials" 
ON public.course_materials 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.instructor = auth.uid()
  )
);

CREATE POLICY "Students can view course materials of enrolled courses" 
ON public.course_materials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_materials.course_id 
    AND (
      courses.is_free = true OR 
      auth.uid() = ANY(courses.enrolled_users) OR
      courses.instructor = auth.uid()
    )
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_order ON public.course_materials(course_id, order_index);