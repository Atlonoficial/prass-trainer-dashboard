import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ContentPermission {
  id: string;
  student_id: string;
  teacher_id: string;
  content_id: string;
  granted_at: string;
  created_at: string;
}

interface ContentPermissions {
  trainingPlans: boolean;
  dietPlans: boolean;
  nutritionLibrary: boolean;
  exerciseLibrary: boolean;
  consultations: boolean;
  reports: boolean;
  courses: boolean;
}

const CONTENT_TYPE_MAP = {
  trainingPlans: 'training_plans',
  dietPlans: 'diet_plans', 
  nutritionLibrary: 'nutrition_library',
  exerciseLibrary: 'exercise_library',
  consultations: 'consultations',
  reports: 'reports',
  courses: 'courses'
};

export function useStudentContentPermissions(studentUserId?: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ContentPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!studentUserId) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('student_content_permissions')
        .select('*')
        .eq('student_id', studentUserId);

      if (fetchError) throw fetchError;
      setPermissions(data || []);

    } catch (err: any) {
      console.error('Error fetching content permissions:', err);
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  const getPermissionsState = useCallback((): ContentPermissions => {
    const state: ContentPermissions = {
      trainingPlans: false,
      dietPlans: false,
      nutritionLibrary: false,
      exerciseLibrary: false,
      consultations: false,
      reports: false,
      courses: false
    };

    permissions.forEach(permission => {
      const contentType = Object.keys(CONTENT_TYPE_MAP).find(
        key => CONTENT_TYPE_MAP[key as keyof typeof CONTENT_TYPE_MAP] === permission.content_id
      ) as keyof ContentPermissions;
      
      if (contentType) {
        state[contentType] = true;
      }
    });

    return state;
  }, [permissions]);

  const updatePermissions = useCallback(async (newPermissions: ContentPermissions) => {
    if (!user?.id || !studentUserId) return false;

    try {
      setLoading(true);
      setError(null);

      // Primeiro, remover todas as permissões existentes do aluno
      const { error: deleteError } = await supabase
        .from('student_content_permissions')
        .delete()
        .eq('student_id', studentUserId)
        .eq('teacher_id', user.id);

      if (deleteError) throw deleteError;

      // Depois, inserir as novas permissões
      const permissionsToInsert = Object.entries(newPermissions)
        .filter(([_, hasPermission]) => hasPermission)
        .map(([contentType, _]) => ({
          student_id: studentUserId,
          teacher_id: user.id,
          content_id: CONTENT_TYPE_MAP[contentType as keyof typeof CONTENT_TYPE_MAP],
          granted_at: new Date().toISOString()
        }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('student_content_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      // Atualizar estado local
      await fetchPermissions();
      return true;

    } catch (err: any) {
      console.error('Error updating permissions:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, studentUserId, fetchPermissions]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Realtime subscription
  useEffect(() => {
    if (!studentUserId) return;

    const channel = supabase
      .channel('student-content-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_content_permissions',
          filter: `student_id=eq.${studentUserId}`
        },
        () => {
          fetchPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentUserId, fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    getPermissionsState,
    updatePermissions,
    refetch: fetchPermissions
  };
}