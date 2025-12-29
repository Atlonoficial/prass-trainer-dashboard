import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeManager } from '@/services/realtimeManager';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
type RealtimeTable = 'students' | 'appointments' | 'workouts' | 'workout_plans' | 'nutrition_plans' | 'notifications' | 'gamification_activities' | 'payment_transactions';

interface RealtimeSubscription {
  table: RealtimeTable;
  event: RealtimeEvent;
  callback: (payload: any) => void;
  filter?: string;
}

interface RealtimeContextType {
  subscribe: (subscription: RealtimeSubscription) => () => void;
  isConnected: boolean;
  lastActivity: Date | null;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Monitor connection health via RealtimeManager stats or simple ping
  useEffect(() => {
    if (!user?.id) return;

    // Simple health check simulation since RealtimeManager handles connection internally
    const healthCheckInterval = setInterval(() => {
      // In a real scenario, we could expose connection state from RealtimeManager
      setIsConnected(true);
    }, 5000);

    return () => clearInterval(healthCheckInterval);
  }, [user?.id]);

  // Cleanup all channels on unmount or user change
  useEffect(() => {
    return () => {
      console.log('🧹 [REALTIME_PROVIDER] Cleaning up all channels via Manager');
      realtimeManager.unsubscribeAll();
    };
  }, [user?.id]);

  // Wrapper for subscribe to match context interface
  const subscribe = useCallback((subscription: RealtimeSubscription) => {
    if (!user?.id) return () => { };

    const callbackWrapper = (payload: any) => {
      setLastActivity(new Date());
      subscription.callback(payload);

      // Dispatch global event for cache invalidation
      window.dispatchEvent(new CustomEvent('realtimeUpdate', {
        detail: {
          table: subscription.table,
          event: subscription.event,
          data: payload
        }
      }));
    };

    const listenerId = realtimeManager.subscribe(
      subscription.table,
      subscription.event,
      callbackWrapper,
      subscription.filter
    );

    return () => {
      realtimeManager.unsubscribe(listenerId);
    };
  }, [user?.id]);

  return (
    <RealtimeContext.Provider value={{ subscribe, isConnected, lastActivity }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

// Convenience hooks for common subscriptions
export function useRealtimeTable(
  table: RealtimeTable,
  onInsert?: (data: any) => void,
  onUpdate?: (data: any) => void,
  onDelete?: (data: any) => void,
  filter?: string
) {
  const { subscribe } = useRealtime();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribers: Array<() => void> = [];

    if (onInsert) {
      const unsub = subscribe({
        table,
        event: 'INSERT',
        callback: (payload) => onInsert(payload.new),
        filter
      });
      unsubscribers.push(unsub);
    }

    if (onUpdate) {
      const unsub = subscribe({
        table,
        event: 'UPDATE',
        callback: (payload) => onUpdate(payload.new),
        filter
      });
      unsubscribers.push(unsub);
    }

    if (onDelete) {
      const unsub = subscribe({
        table,
        event: 'DELETE',
        callback: (payload) => onDelete(payload.old),
        filter
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.id, table, onInsert, onUpdate, onDelete, filter, subscribe]);
}
