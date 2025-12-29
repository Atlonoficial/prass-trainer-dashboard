-- ===================================================
-- HABILITAR REALTIME NAS TABELAS PRINCIPAIS
-- Execute no SQL Editor do Supabase
-- ===================================================

-- Adicionar tabelas à publicação supabase_realtime
-- Execute cada linha individualmente se alguma falhar

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_locations;

-- Verificar publicações
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
