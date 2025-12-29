-- Create evaluation_requests table
CREATE TABLE public.evaluation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.evaluation_templates(id),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending', 'completed', 'expired')),
  due_date timestamp with time zone,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  evaluation_id uuid REFERENCES public.evaluations(id)
);

-- Enable RLS on evaluation_requests
ALTER TABLE public.evaluation_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for evaluation_requests
CREATE POLICY "Teachers can create evaluation requests"
ON public.evaluation_requests
FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their evaluation requests"
ON public.evaluation_requests
FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their evaluation requests"
ON public.evaluation_requests
FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view their evaluation requests"
ON public.evaluation_requests
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can update their evaluation requests"
ON public.evaluation_requests
FOR UPDATE
USING (auth.uid() = student_id AND status = 'pending');

-- Create trigger to update updated_at
CREATE TRIGGER update_evaluation_requests_updated_at
BEFORE UPDATE ON public.evaluation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();