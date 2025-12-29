import React, { createContext, useContext, useCallback, useRef } from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface GlobalCacheContextType {
  get: <T>(key: string) => T | null
  set: <T>(key: string, data: T, ttl?: number) => void
  invalidate: (key: string) => void
  invalidatePattern: (pattern: string) => void
  clear: () => void
}

const GlobalCacheContext = createContext<GlobalCacheContextType | null>(null)

// Adaptive TTL based on data type
const CACHE_TTL = {
  profile: 10 * 60 * 1000,      // 10 min (changes rarely)
  students: 3 * 60 * 1000,      // 3 min (moderate changes)
  appointments: 2 * 60 * 1000,  // 2 min (frequent changes)
  payments: 2 * 60 * 1000,      // 2 min (critical, needs freshness)
  workouts: 3 * 60 * 1000,      // 3 min
  notifications: 1 * 60 * 1000, // 1 min (very dynamic)
  default: 5 * 60 * 1000        // 5 min fallback
}

const DEFAULT_TTL = CACHE_TTL.default

export function GlobalCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, CacheItem<any>>>(new Map())

  const get = useCallback(<T,>(key: string): T | null => {
    const item = cacheRef.current.get(key)
    
    if (!item) return null
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      cacheRef.current.delete(key)
      return null
    }
    
    return item.data
  }, [])

  const set = useCallback(<T,>(key: string, data: T, customTtl?: number) => {
    // Determine TTL based on key pattern if not provided
    let ttl = customTtl || DEFAULT_TTL
    
    if (!customTtl) {
      if (key.includes('profile')) ttl = CACHE_TTL.profile
      else if (key.includes('students')) ttl = CACHE_TTL.students
      else if (key.includes('appointments')) ttl = CACHE_TTL.appointments
      else if (key.includes('payments')) ttl = CACHE_TTL.payments
      else if (key.includes('workouts')) ttl = CACHE_TTL.workouts
      else if (key.includes('notifications')) ttl = CACHE_TTL.notifications
    }
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }, [])

  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key)
  }, [])

  const invalidatePattern = useCallback((pattern: string) => {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    for (const key of cacheRef.current.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => cacheRef.current.delete(key))
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  const value: GlobalCacheContextType = {
    get,
    set,
    invalidate,
    invalidatePattern,
    clear
  }

  return (
    <GlobalCacheContext.Provider value={value}>
      {children}
    </GlobalCacheContext.Provider>
  )
}

export function useGlobalCache() {
  const context = useContext(GlobalCacheContext)
  if (!context) {
    throw new Error('useGlobalCache must be used within GlobalCacheProvider')
  }
  return context
}