/**
 * Sistema de Cache Inteligente com TTL Adaptativo
 * Gerencia cache de dados com invalidação automática e performance tracking
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccess: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  avgTTL: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export class SmartCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(defaultTTL: number = 5 * 60 * 1000, maxSize: number = 100) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;

    // Auto cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);

    // Listen to realtime updates for automatic invalidation
    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeUpdate', ((event: CustomEvent) => {
        const { table } = event.detail;
        this.invalidateByPattern(table);
      }) as EventListener);
    }
  }

  /**
   * Set cache entry with adaptive TTL
   */
  set(key: string, data: T, ttl?: number): void {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    const effectiveTTL = ttl || this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: effectiveTTL,
      hits: 0,
      lastAccess: now
    });

    console.log(`💾 [CACHE] Set: ${key} (TTL: ${effectiveTTL}ms)`);
  }

  /**
   * Get cache entry with automatic TTL extension on frequent access
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses++;
      console.log(`❌ [CACHE] Miss: ${key}`);
      return null;
    }

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      console.log(`⏰ [CACHE] Expired: ${key}`);
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = now;
    this.hits++;

    // Adaptive TTL: Extend TTL for frequently accessed entries
    if (entry.hits > 5 && entry.ttl < this.defaultTTL * 2) {
      entry.ttl = Math.min(entry.ttl * 1.5, this.defaultTTL * 2);
      console.log(`⏱️ [CACHE] Extended TTL for ${key}: ${entry.ttl}ms`);
    }

    console.log(`✅ [CACHE] Hit: ${key} (hits: ${entry.hits})`);
    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ [CACHE] Invalidated: ${key}`);
    }
  }

  /**
   * Invalidate keys matching pattern
   */
  invalidateByPattern(pattern: string): void {
    let count = 0;
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    });
    if (count > 0) {
      console.log(`🗑️ [CACHE] Invalidated ${count} entries matching: ${pattern}`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log(`🧹 [CACHE] Cleared all ${size} entries`);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    });

    if (removed > 0) {
      console.log(`🧹 [CACHE] Cleanup: Removed ${removed} expired entries`);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [CACHE] Evicted LRU: ${oldestKey}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    let totalTTL = 0;
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    this.cache.forEach((entry) => {
      totalTTL += entry.ttl;
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (!newestTimestamp || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    });

    return {
      totalEntries: this.cache.size,
      totalHits: this.hits,
      totalMisses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgTTL: this.cache.size > 0 ? totalTTL / this.cache.size : 0,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('📊 [CACHE] Statistics:', stats);
  }
}

// Global cache instances
export const studentsCache = new SmartCache(5 * 60 * 1000); // 5 minutes
export const appointmentsCache = new SmartCache(3 * 60 * 1000); // 3 minutes
export const workoutsCache = new SmartCache(5 * 60 * 1000); // 5 minutes
export const notificationsCache = new SmartCache(2 * 60 * 1000); // 2 minutes
export const paymentsCache = new SmartCache(5 * 60 * 1000); // 5 minutes
export const gamificationCache = new SmartCache(3 * 60 * 1000); // 3 minutes

// Export convenience function to invalidate all caches
export function invalidateAllCaches() {
  studentsCache.clear();
  appointmentsCache.clear();
  workoutsCache.clear();
  notificationsCache.clear();
  paymentsCache.clear();
  gamificationCache.clear();
  console.log('🧹 [CACHE] All caches invalidated');
}

// Export function to log all cache stats
export function logAllCacheStats() {
  console.log('📊 [CACHE] === Global Cache Statistics ===');
  console.log('Students:', studentsCache.getStats());
  console.log('Appointments:', appointmentsCache.getStats());
  console.log('Workouts:', workoutsCache.getStats());
  console.log('Notifications:', notificationsCache.getStats());
  console.log('Payments:', paymentsCache.getStats());
  console.log('Gamification:', gamificationCache.getStats());
}
