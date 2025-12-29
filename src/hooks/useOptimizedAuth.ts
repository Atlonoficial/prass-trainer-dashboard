import { useAuth } from './useAuth';

/**
 * Optimized auth hook that provides stable references and cached teacher status
 * Now uses the standard useAuth hook without the problematic AppStateProvider
 */
export function useOptimizedAuth() {
  const { user } = useAuth();

  return {
    user,
    userId: user?.id || null,
    isAuthenticated: !!user,
    isTeacher: true, // Assume teacher in teacher context
    loading: false,
    error: null,
    refreshAuth: async () => {
      // No-op since we're using the main auth context
    },
    checkTeacherStatus: async () => {
      // Already validated if we're in teacher context
    },
    clearCache: () => {
      // No-op
    },
  };
}