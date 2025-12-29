import { useState, useCallback, useRef } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  key: string;
}

interface AIDietCacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export function useAIDietCache(options: AIDietCacheOptions = {}) {
  const { maxSize = 50, ttl = 30 * 60 * 1000 } = options; // 30 minutes default TTL
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, size: 0 });

  const generateKey = useCallback((studentId: string, goal: string, useAnamnesis: boolean) => {
    return `diet_${studentId}_${goal}_${useAnamnesis}`;
  }, []);

  const set = useCallback((key: string, data: any) => {
    const cache = cacheRef.current;
    
    // Remove expired entries
    const now = Date.now();
    for (const [cacheKey, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        cache.delete(cacheKey);
      }
    }

    // Remove oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    cache.set(key, {
      data,
      timestamp: now,
      key
    });

    setCacheStats(prev => ({ ...prev, size: cache.size }));
  }, [maxSize, ttl]);

  const get = useCallback((key: string) => {
    const cache = cacheRef.current;
    const entry = cache.get(key);
    
    if (!entry) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1, size: cache.size }));
      return null;
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.data;
  }, [ttl]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    setCacheStats({ hits: 0, misses: 0, size: 0 });
  }, []);

  const has = useCallback((key: string) => {
    const entry = cacheRef.current.get(key);
    return entry && (Date.now() - entry.timestamp <= ttl);
  }, [ttl]);

  return {
    set,
    get,
    clear,
    has,
    generateKey,
    stats: cacheStats
  };
}