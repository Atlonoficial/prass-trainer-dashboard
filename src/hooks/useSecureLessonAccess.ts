import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LessonAccess {
  hasAccess: boolean;
  loading: boolean;
  lesson?: any;
  accessReason?: 'free' | 'purchased' | 'instructor' | 'free_course';
}

export function useSecureLessonAccess(lessonId?: string): LessonAccess {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [accessReason, setAccessReason] = useState<LessonAccess['accessReason']>();
  const { toast } = useToast();

  useEffect(() => {
    const checkLessonAccess = async () => {
      if (!lessonId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Attempt to fetch lesson with all security checks applied by RLS
        const { data: lessonData, error: lessonError } = await supabase
          .from('course_lessons')
          .select(`
            *,
            course_modules!inner (
              *,
              courses!inner (
                id,
                title,
                is_free,
                instructor,
                is_published
              )
            )
          `)
          .eq('id', lessonId)
          .single();

        if (lessonError) {
          console.error('Lesson access denied by RLS:', lessonError);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        if (!lessonData) {
          console.warn('Lesson not found or access denied');
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setLesson(lessonData);
        const course = lessonData.course_modules.courses;

        // Determine access reason for transparency
        if (course.instructor === user.id) {
          setAccessReason('instructor');
          setHasAccess(true);
        } else if (lessonData.is_free) {
          setAccessReason('free');
          setHasAccess(true);
        } else if (course.is_free) {
          setAccessReason('free_course');
          setHasAccess(true);
        } else {
          // For paid content, verify real purchase via payment_transactions
          const { data: purchase } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('student_id', user.id)
            .eq('course_id', course.id)
            .eq('status', 'paid')
            .limit(1);

          if (purchase && purchase.length > 0) {
            setAccessReason('purchased');
            setHasAccess(true);
          } else {
            console.warn('No valid purchase found for paid lesson');
            setHasAccess(false);
          }
        }

        console.log(`✅ Lesson access granted: ${accessReason} - "${lessonData.title}"`);
      } catch (error) {
        console.error('Error checking lesson access:', error);
        setHasAccess(false);
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta aula',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    checkLessonAccess();
  }, [lessonId, toast]);

  return { hasAccess, loading, lesson, accessReason };
}