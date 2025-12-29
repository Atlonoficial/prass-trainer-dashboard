-- Corrigir foreign keys para permitir exclusão em cascata de usuários

-- 1. students.teacher_id
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_teacher_id_fkey;

ALTER TABLE public.students
ADD CONSTRAINT students_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 2. courses.instructor
ALTER TABLE public.courses 
DROP CONSTRAINT IF EXISTS courses_instructor_fkey;

ALTER TABLE public.courses
ADD CONSTRAINT courses_instructor_fkey 
FOREIGN KEY (instructor) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. payments.teacher_id
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_teacher_id_fkey;

ALTER TABLE public.payments
ADD CONSTRAINT payments_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 4. notifications.created_by
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_created_by_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 5. nutrition_formulas.created_by
ALTER TABLE public.nutrition_formulas 
DROP CONSTRAINT IF EXISTS nutrition_formulas_created_by_fkey;

ALTER TABLE public.nutrition_formulas
ADD CONSTRAINT nutrition_formulas_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 6. user_goals.teacher_id
ALTER TABLE public.user_goals 
DROP CONSTRAINT IF EXISTS user_goals_teacher_id_fkey;

ALTER TABLE public.user_goals
ADD CONSTRAINT user_goals_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 7. achievements.created_by
ALTER TABLE public.achievements 
DROP CONSTRAINT IF EXISTS achievements_created_by_fkey;

ALTER TABLE public.achievements
ADD CONSTRAINT achievements_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 8. advanced_techniques.created_by
ALTER TABLE public.advanced_techniques 
DROP CONSTRAINT IF EXISTS advanced_techniques_created_by_fkey;

ALTER TABLE public.advanced_techniques
ADD CONSTRAINT advanced_techniques_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 9. banners.created_by
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_created_by_fkey;

ALTER TABLE public.banners
ADD CONSTRAINT banners_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 10. challenges.teacher_id
ALTER TABLE public.challenges 
DROP CONSTRAINT IF EXISTS challenges_teacher_id_fkey;

ALTER TABLE public.challenges
ADD CONSTRAINT challenges_teacher_id_fkey 
FOREIGN KEY (teacher_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 11. evaluation_templates.created_by
ALTER TABLE public.evaluation_templates 
DROP CONSTRAINT IF EXISTS evaluation_templates_created_by_fkey;

ALTER TABLE public.evaluation_templates
ADD CONSTRAINT evaluation_templates_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 12. ab_tests.created_by
ALTER TABLE public.ab_tests 
DROP CONSTRAINT IF EXISTS ab_tests_created_by_fkey;

ALTER TABLE public.ab_tests
ADD CONSTRAINT ab_tests_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Comentário final
COMMENT ON CONSTRAINT students_teacher_id_fkey ON public.students IS 
'Foreign key com CASCADE para permitir exclusão de professores';

COMMENT ON CONSTRAINT courses_instructor_fkey ON public.courses IS 
'Foreign key com CASCADE para permitir exclusão de instrutores';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Todas as foreign keys foram atualizadas para usar ON DELETE CASCADE';
END $$;