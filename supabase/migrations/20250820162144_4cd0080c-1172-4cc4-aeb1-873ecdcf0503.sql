-- Create training_locations table
CREATE TABLE public.training_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gym',
  address TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for training_locations
CREATE POLICY "Teachers can create own locations" 
ON public.training_locations 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view own locations" 
ON public.training_locations 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own locations" 
ON public.training_locations 
FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own locations" 
ON public.training_locations 
FOR DELETE 
USING (auth.uid() = teacher_id);

-- Students can view their teacher's active locations
CREATE POLICY "Students can view teacher locations" 
ON public.training_locations 
FOR SELECT 
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.user_id = auth.uid() AND s.teacher_id = training_locations.teacher_id
  )
);

-- Add location_id to appointments table for reference
ALTER TABLE public.appointments ADD COLUMN location_id UUID REFERENCES public.training_locations(id);

-- Create trigger for updated_at
CREATE TRIGGER update_training_locations_updated_at
  BEFORE UPDATE ON public.training_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();