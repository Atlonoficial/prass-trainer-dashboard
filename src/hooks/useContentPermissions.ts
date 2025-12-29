import { useState, useEffect } from 'react';
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

export function useContentPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ContentPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_content_permissions')
        .select('*')
        .eq('student_id', user.id);

      if (error) throw error;
      setPermissions(data || []);

    } catch (error) {
      console.error('Error fetching content permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasContentAccess = (contentId: string): boolean => {
    return permissions.some(permission => permission.content_id === contentId);
  };

  const getPermissionsByTeacher = (teacherId: string): ContentPermission[] => {
    return permissions.filter(permission => permission.teacher_id === teacherId);
  };

  useEffect(() => {
    fetchPermissions();
  }, [user?.id]);

  // Realtime subscription para mudanças de permissões
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('content-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_content_permissions',
          filter: `student_id=eq.${user.id}`
        },
        () => {
          fetchPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    permissions,
    loading,
    hasContentAccess,
    getPermissionsByTeacher,
    refetch: fetchPermissions
  };
}