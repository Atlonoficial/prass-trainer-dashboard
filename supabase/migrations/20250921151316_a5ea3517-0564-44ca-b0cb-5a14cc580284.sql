-- Create teacher feedback settings table
CREATE TABLE public.teacher_feedback_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  default_feedback_period INTEGER NOT NULL DEFAULT 30,
  feedbacks_per_page INTEGER NOT NULL DEFAULT 10,
  auto_request_feedback BOOLEAN NOT NULL DEFAULT false,
  feedback_reminder_days INTEGER NOT NULL DEFAULT 7,
  show_feedback_stats BOOLEAN NOT NULL DEFAULT true,
  feedback_types_enabled TEXT[] NOT NULL DEFAULT '{workout,diet,general}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Enable RLS
ALTER TABLE public.teacher_feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Teachers can view own feedback settings" 
ON public.teacher_feedback_settings 
FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create own feedback settings" 
ON public.teacher_feedback_settings 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own feedback settings" 
ON public.teacher_feedback_settings 
FOR UPDATE 
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_feedback_settings_updated_at
  BEFORE UPDATE ON public.teacher_feedback_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_feedback_settings_updated_at();