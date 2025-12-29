-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('workout', 'diet', 'general')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message text NOT NULL,
  related_item_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Students can create feedbacks for their teacher
CREATE POLICY "Students can create feedbacks for their teacher"
ON public.feedbacks
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = student_id AND s.teacher_id = feedbacks.teacher_id
  )
);

-- Students can view their own feedbacks
CREATE POLICY "Students can view their own feedbacks"
ON public.feedbacks
FOR SELECT
USING (auth.uid() = student_id);

-- Teachers can view feedbacks from their students
CREATE POLICY "Teachers can view student feedbacks"
ON public.feedbacks
FOR SELECT
USING (
  auth.uid() = teacher_id AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = student_id AND s.teacher_id = auth.uid()
  )
);

-- Students can update their own feedbacks
CREATE POLICY "Students can update their own feedbacks"
ON public.feedbacks
FOR UPDATE
USING (auth.uid() = student_id);

-- Create trigger for updated_at
CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();