// DEPRECATED: Use useCachedChatStats instead for better performance
// This hook has been replaced with an optimized version that includes:
// - Intelligent caching with 30s TTL
// - Rate limiting (1 req/second)
// - Consolidated subscriptions
// - Automatic debouncing

import { useCachedChatStats } from './useCachedChatStats'

export interface ChatStats {
  conversationsWithTeacherToday: number
  conversationsWithStudentsToday: number
  unreadTeacherMessages: number
  responseRate: number
  activeStudents: number
  totalConversations: number
}

export function useChatStats() {
  console.warn('⚠️ useChatStats is deprecated. Use useCachedChatStats instead for better performance.')
  
  const { stats, loading, refetch } = useCachedChatStats()
  
  return { 
    stats, 
    loading, 
    refetch 
  }
}