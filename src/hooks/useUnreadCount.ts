// DEPRECATED: Use useOptimizedUnreadCount instead
// This hook has been replaced with an optimized version that includes:
// - Local caching with 5s TTL  
// - Rate limiting protection
// - Instant local updates
// - Better error handling

import { useOptimizedUnreadCount } from './useOptimizedUnreadCount'

export function useUnreadCount() {
  console.warn('⚠️ useUnreadCount is deprecated. Use useOptimizedUnreadCount instead.')
  
  const { unreadCount } = useOptimizedUnreadCount()
  
  return unreadCount
}