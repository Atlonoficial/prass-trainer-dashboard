-- Create teacher booking settings table
CREATE TABLE public.teacher_booking_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL,
  minimum_advance_hours integer NOT NULL DEFAULT 2,
  visibility_days integer NOT NULL DEFAULT 7,
  allow_same_day boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Enable RLS
ALTER TABLE public.teacher_booking_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can manage own booking settings" 
ON public.teacher_booking_settings 
FOR ALL 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Students can view their teacher's booking settings
CREATE POLICY "Students can view teacher booking settings" 
ON public.teacher_booking_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM students s 
  WHERE s.user_id = auth.uid() 
  AND s.teacher_id = teacher_booking_settings.teacher_id
));

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_booking_settings_updated_at
  BEFORE UPDATE ON public.teacher_booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();