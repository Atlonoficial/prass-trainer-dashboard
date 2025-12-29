import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para sincronização inteligente de dados do estudante
 * Gerencia cache, real-time updates e eventos customizados
 */
export function useStudentSync() {
  
  // Função para invalidar cache de forma inteligente
  const invalidateStudentCache = useCallback((studentId?: string) => {
    console.log('🧹 Cache: Invalidando cache de estudantes', { studentId });
    
    // Disparar evento global para todos os componentes que precisam atualizar
    window.dispatchEvent(new CustomEvent('studentCacheInvalidated', { 
      detail: { studentId, timestamp: Date.now() } 
    }));
  }, []);

  // Função para forçar sincronização completa
  const forceSyncAll = useCallback(() => {
    console.log('🔄 Sync: Forçando sincronização completa do sistema');
    
    // Evento global para refresh completo
    window.dispatchEvent(new CustomEvent('forceStudentSync', { 
      detail: { timestamp: Date.now(), source: 'manual' } 
    }));
  }, []);

  // Escutar mudanças via Real-time e eventos customizados
  useEffect(() => {
    // Listener para mudanças no banco (real-time)
    const studentChannel = supabase
      .channel('student-sync-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('📡 Real-time: Mudança detectada na tabela students:', payload);
          invalidateStudentCache((payload.new as any)?.user_id || (payload.old as any)?.user_id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('📡 Real-time: Mudança detectada na tabela profiles:', payload);
          invalidateStudentCache((payload.new as any)?.id || (payload.old as any)?.id);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Removendo listeners de sincronização');
      supabase.removeChannel(studentChannel);
    };
  }, [invalidateStudentCache]);

  return {
    invalidateStudentCache,
    forceSyncAll
  };
}

/**
 * Hook para escutar eventos de sincronização em componentes específicos
 */
export function useStudentSyncListener(onSync: () => void | Promise<void>) {
  useEffect(() => {
    const handleCacheInvalidation = (event: CustomEvent) => {
      console.log('👂 Listener: Cache invalidado, executando sync...', event.detail);
      onSync();
    };

    const handleForceSync = (event: CustomEvent) => {
      console.log('👂 Listener: Sync forçado, executando refresh...', event.detail);
      onSync();
    };

    // Registrar listeners para eventos customizados
    window.addEventListener('studentCacheInvalidated', handleCacheInvalidation as EventListener);
    window.addEventListener('forceStudentSync', handleForceSync as EventListener);
    window.addEventListener('studentDataUpdated', handleForceSync as EventListener);

    return () => {
      window.removeEventListener('studentCacheInvalidated', handleCacheInvalidation as EventListener);
      window.removeEventListener('forceStudentSync', handleForceSync as EventListener);
      window.removeEventListener('studentDataUpdated', handleForceSync as EventListener);
    };
  }, [onSync]);
}

/**
 * Hook para debounce de operações custosas
 */
export function useStudentDebounce(callback: Function, delay: number = 300) {
  const debouncedCallback = useCallback((...args: any[]) => {
    const timeoutId = setTimeout(() => callback(...args), delay);
    return () => clearTimeout(timeoutId);
  }, [callback, delay]);

  return debouncedCallback;
}