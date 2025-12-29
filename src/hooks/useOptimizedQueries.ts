import { useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// FASE 1: Cache LRU otimizado e simplificado
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string, ttl = this.defaultTTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return { size: this.cache.size };
  }
}

const queryCache = new SimpleCache(200);

export function useOptimizedQueries(userId?: string) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestQueue = useRef<Map<string, Promise<any>>>(new Map());

  // Query otimizada com cache
  const optimizedQuery = useCallback(async (
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      forceRefresh?: boolean;
    } = {}
  ) => {
    if (!userId) throw new Error('User ID required');

    const { 
      select = '*', 
      filters = {}, 
      order, 
      limit,
      forceRefresh = false 
    } = options;

    const cacheKey = `${table}_${JSON.stringify({ select, filters, order, limit })}_${userId}`;

    // Check cache
    if (!forceRefresh) {
      const cached = queryCache.get(cacheKey);
      if (cached) return cached;
    }

    // Check request queue
    if (requestQueue.current.has(cacheKey)) {
      return requestQueue.current.get(cacheKey);
    }

    const promise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        let query = supabase.from(table as any).select(select);
        
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });

        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? false });
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query.abortSignal(abortControllerRef.current.signal);
        
        if (error) throw error;
        
        const result = { data, error: null };
        queryCache.set(cacheKey, result);
        return result;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          const result = { data: null, error };
          return result;
        }
        throw error;
      } finally {
        requestQueue.current.delete(cacheKey);
      }
    })();

    requestQueue.current.set(cacheKey, promise);
    return promise;
  }, [userId]);

  // Batch queries para teacher data
  const getTeacherDataOptimized = useCallback(async (forceRefresh = false) => {
    if (!userId) return null;

    const promises = [
      optimizedQuery('students', {
        filters: { teacher_id: userId },
        order: { column: 'created_at', ascending: false },
        limit: 100,
        forceRefresh
      }),
      optimizedQuery('plan_catalog', {
        filters: { teacher_id: userId },
        order: { column: 'created_at', ascending: false },
        forceRefresh
      }),
      optimizedQuery('plan_subscriptions', {
        filters: { teacher_id: userId },
        order: { column: 'created_at', ascending: false },
        limit: 100,
        forceRefresh
      }),
      optimizedQuery('payment_transactions', {
        select: '*, service_pricing(*)',
        filters: { teacher_id: userId },
        order: { column: 'created_at', ascending: false },
        limit: 50,
        forceRefresh
      })
    ];

    return Promise.all(promises);
  }, [userId, optimizedQuery]);

  const clearCache = useCallback((pattern?: string) => {
    queryCache.clear(pattern);
    requestQueue.current.clear();
  }, []);

  const getPerformanceStats = useCallback(() => ({
    cacheSize: queryCache.getStats().size,
    activeRequests: requestQueue.current.size
  }), []);

  return {
    optimizedQuery,
    getTeacherDataOptimized,
    clearCache,
    getPerformanceStats
  };
}