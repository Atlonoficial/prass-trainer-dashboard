import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getClientSlug, getTenantByDomain } from '@/utils/clientSlug';

interface AuthSystemState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isTeacher: boolean | null;
  teacherChecked: boolean;
  error: string | null;
  cache: {
    teacherStatus: { isTeacher: boolean; timestamp: number; userId: string } | null;
  };
}

type AuthSystemAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTH'; payload: { user: User | null; session: Session | null } }
  | { type: 'SET_TEACHER_STATUS'; payload: { isTeacher: boolean; userId: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_CACHE' };

const initialState: AuthSystemState = {
  user: null,
  session: null,
  loading: true,
  isTeacher: null,
  teacherChecked: false,
  error: null,
  cache: {
    teacherStatus: null
  }
};

const TEACHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function authSystemReducer(state: AuthSystemState, action: AuthSystemAction): AuthSystemState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_AUTH':
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        loading: false,
        error: null
      };
    case 'SET_TEACHER_STATUS':
      return {
        ...state,
        isTeacher: action.payload.isTeacher,
        teacherChecked: true,
        cache: {
          ...state.cache,
          teacherStatus: {
            isTeacher: action.payload.isTeacher,
            timestamp: Date.now(),
            userId: action.payload.userId
          }
        },
        error: null
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: { teacherStatus: null },
        isTeacher: null,
        teacherChecked: false
      };
    default:
      return state;
  }
}

interface AuthSystemContextType extends AuthSystemState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkTeacherStatus: (force?: boolean) => Promise<boolean>;
  clearCache: () => void;
}

const AuthSystemContext = createContext<AuthSystemContextType | undefined>(undefined);

export function useAuthSystem() {
  const context = useContext(AuthSystemContext);
  if (!context) {
    throw new Error('useAuthSystem must be used within AuthSystemProvider');
  }
  return context;
}

interface AuthSystemProviderProps {
  children: React.ReactNode;
}

export function AuthSystemProvider({ children }: AuthSystemProviderProps) {
  const [state, dispatch] = useReducer(authSystemReducer, initialState);
  const initializeRef = useRef(false);

  const isTeacherCacheValid = useCallback((userId: string) => {
    const cache = state.cache.teacherStatus;
    if (!cache || cache.userId !== userId) return false;
    return Date.now() - cache.timestamp < TEACHER_CACHE_TTL;
  }, [state.cache.teacherStatus]);

  const checkTeacherStatus = useCallback(async (force = false) => {
    if (!state.user?.id) return false;
    
    if (!force && isTeacherCacheValid(state.user.id)) {
      return state.cache.teacherStatus!.isTeacher;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', state.user.id)
        .single();

      if (error) {
        console.error('Error checking teacher status:', error);
        return false;
      }

      const isTeacher = data?.user_type === 'teacher';
      dispatch({ 
        type: 'SET_TEACHER_STATUS', 
        payload: { isTeacher, userId: state.user.id } 
      });
      
      return isTeacher;
    } catch (error) {
      console.error('Error checking teacher status:', error);
      return false;
    }
  }, [state.user?.id, isTeacherCacheValid, state.cache.teacherStatus]);

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userType: 'student' | 'teacher' = 'student') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Detectar tenant
      const tenant = await getTenantByDomain();
      
      if (!tenant.tenantId) {
        throw new Error('Tenant não identificado. Verifique o domínio de acesso.');
      }
      
      const clienteSlug = getClientSlug();
      
      // Usar detectOrigin para evitar URLs do Lovable
      const { detectOrigin, sanitizeRedirectUrl } = await import('@/utils/domainDetector')
      const baseRedirectUrl = detectOrigin(userType)
      const redirectUrl = sanitizeRedirectUrl(
        `${baseRedirectUrl}&slug=${clienteSlug}`,
        userType
      )
      
      console.log('[AuthSystemContext.signUp] Guard-rail aplicado:', {
        hostname: window.location.hostname,
        userType,
        redirectUrl
      });

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            tenant_id: tenant.tenantId,
            user_type: userType
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      dispatch({ type: 'CLEAR_CACHE' });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        dispatch({ 
          type: 'SET_AUTH', 
          payload: { user: session?.user ?? null, session } 
        });
        
        // Check teacher status when user signs in
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            checkTeacherStatus(true);
          }, 100);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ 
        type: 'SET_AUTH', 
        payload: { user: session?.user ?? null, session } 
      });
      
      if (session?.user) {
        setTimeout(() => {
          checkTeacherStatus();
        }, 100);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkTeacherStatus]);

  const contextValue: AuthSystemContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    checkTeacherStatus,
    clearCache
  };

  return (
    <AuthSystemContext.Provider value={contextValue}>
      {children}
    </AuthSystemContext.Provider>
  );
}