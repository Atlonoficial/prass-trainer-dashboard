-- Criar bucket para PDFs de cardápios
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-pdfs', 'menu-pdfs', false);

-- Criar tabela para biblioteca de cardápios
CREATE TABLE public.menu_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  folder_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT DEFAULT 'pdf',
  file_size BIGINT,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_library ENABLE ROW LEVEL SECURITY;

-- Policies para menu_library
CREATE POLICY "Teachers can manage own menus"
ON public.menu_library
FOR ALL
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Policies para storage bucket menu-pdfs
CREATE POLICY "Teachers can view own menu PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'menu-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can upload menu PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'menu-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can update own menu PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'menu-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can delete own menu PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'menu-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger para updated_at
CREATE TRIGGER update_menu_library_updated_at
BEFORE UPDATE ON public.menu_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();