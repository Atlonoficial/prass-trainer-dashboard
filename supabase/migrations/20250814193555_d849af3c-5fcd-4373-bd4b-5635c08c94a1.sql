-- Enable real-time for appointments table
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Enable real-time for teacher_availability table  
ALTER TABLE public.teacher_availability REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_availability;