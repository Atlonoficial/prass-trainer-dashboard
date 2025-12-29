// FASE 3: IMPLEMENTAR SINCRONIZAÇÃO REAL-TIME - Hook dedicado para sincronização

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface RealTimeSyncOptions {
  onStudentChange?: () => void;
  onProfileChange?: () => void;
  onPlanChange?: () => void;
  enabled?: boolean;
}

export function useRealTimeSync({
  onStudentChange,
  onProfileChange,
  onPlanChange,
  enabled = true
}: RealTimeSyncOptions) {
  const { user } = useSupabaseAuth();
  const channelsRef = useRef<any[]>([]);
  const debounceTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Função para debounce das notificações
  const debouncedCall = useCallback((key: string, callback: () => void, delay = 300) => {
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }
    
    debounceTimersRef.current[key] = setTimeout(() => {
      callback();
      delete debounceTimersRef.current[key];
    }, delay);
  }, []);

  useEffect(() => {
    if (!user?.id || !enabled) return;

    console.log('🔗 Configurando sincronização real-time avançada');

    // Canal para mudanças na tabela students
    if (onStudentChange) {
      const studentsChannel = supabase
        .channel(`students-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students',
            filter: `teacher_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📡 Real-time: Mudança em students:', payload.eventType);
            debouncedCall('students', onStudentChange, 200);
          }
        )
        .subscribe();

      channelsRef.current.push(studentsChannel);
    }

    // Canal para mudanças na tabela profiles
    if (onProfileChange) {
      const profilesChannel = supabase
        .channel(`profiles-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('📡 Real-time: Mudança em profiles:', payload.new?.id);
            debouncedCall('profiles', onProfileChange, 250);
          }
        )
        .subscribe();

      channelsRef.current.push(profilesChannel);
    }

    // Canal para mudanças na tabela plan_catalog
    if (onPlanChange) {
      const plansChannel = supabase
        .channel(`plans-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plan_catalog',
            filter: `teacher_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📡 Real-time: Mudança em plans:', payload.eventType);
            debouncedCall('plans', onPlanChange, 150);
          }
        )
        .subscribe();

      channelsRef.current.push(plansChannel);
    }

    // Cleanup function
    return () => {
      console.log('🔌 Removendo canais de sincronização real-time');
      
      // Limpar timers de debounce
      Object.values(debounceTimersRef.current).forEach(timer => clearTimeout(timer));
      debounceTimersRef.current = {};
      
      // Remover canais
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, enabled, onStudentChange, onProfileChange, onPlanChange, debouncedCall]);

  // Função para forçar sincronização manual
  const forceSync = useCallback(() => {
    console.log('🔄 Forçando sincronização manual');
    
    if (onStudentChange) onStudentChange();
    if (onProfileChange) onProfileChange();
    if (onPlanChange) onPlanChange();
  }, [onStudentChange, onProfileChange, onPlanChange]);

  // Função para emitir eventos customizados
  const emitSyncEvent = useCallback((eventType: string) => {
    window.dispatchEvent(new CustomEvent(eventType));
  }, []);

  return {
    forceSync,
    emitSyncEvent,
    isEnabled: enabled && Boolean(user?.id)
  };
}

// Hook mais simples para sincronização de estudantes apenas
export function useStudentRealTimeSync(onSync: () => void, enabled = true) {
  return useRealTimeSync({
    onStudentChange: onSync,
    onProfileChange: onSync,
    enabled
  });
}