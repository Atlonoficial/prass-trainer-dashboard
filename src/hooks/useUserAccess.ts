import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserAccess {
  hasAccess: boolean;
  loading: boolean;
  purchaseData?: any;
  isInstructor?: boolean;
  courseData?: any;
}

export function useUserAccess(courseId?: string): UserAccess {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<UserAccess['purchaseData']>();
  const [isInstructor, setIsInstructor] = useState(false);
  const [courseData, setCourseData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      if (!courseId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get current user first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Fetch course data with comprehensive security check
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('is_free, price, instructor, is_published, title')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Course access denied:', courseError);
          throw new Error('Curso não encontrado ou acesso negado');
        }

        setCourseData(courseData);

        // Check if user is the instructor
        const userIsInstructor = courseData.instructor === user.id;
        setIsInstructor(userIsInstructor);

        // Instructors always have access to their own courses
        if (userIsInstructor) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Course must be published for students
        if (!courseData.is_published) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Free courses - allow access if published
        if (courseData.is_free) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Paid courses - verify purchase
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('user_purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (purchaseError && purchaseError.code !== 'PGRST116') {
          throw purchaseError;
        }

        if (purchaseData) {
          setHasAccess(true);
          setPurchaseData(purchaseData);
        } else {
          console.warn('Access denied: No purchase record found for paid course');
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking user access:', error);
        setHasAccess(false);
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar este curso',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [courseId, toast]);

  return { hasAccess, loading, purchaseData, isInstructor, courseData };
}

export async function simulatePurchase(courseId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Simular compra inserindo em user_purchases
    const { error } = await supabase
      .from('user_purchases')
      .insert({
        user_id: user.id,
        course_id: courseId,
        order_id: `sim-${Date.now()}`,
        purchase_type: 'course'
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error simulating purchase:', error);
    return false;
  }
}