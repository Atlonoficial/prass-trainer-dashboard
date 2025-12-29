import { useUnifiedChatSystem } from './useUnifiedChatSystem'

export interface ChatStats {
  conversationsWithTeacherToday: number
  conversationsWithStudentsToday: number
  unreadTeacherMessages: number
  responseRate: number
  activeStudents: number
  totalConversations: number
}

interface CachedStats {
  data: ChatStats
  timestamp: number
  loading: boolean
}

const CACHE_DURATION = 30000 // 30 segundos
const DEBOUNCE_DELAY = 1000 // 1 segundo para debounce

export function useCachedChatStats() {
  // DEPRECATED: Este hook foi consolidado no useUnifiedChatSystem
  console.warn('⚠️ useCachedChatStats está obsoleto. Use useUnifiedChatSystem para melhor performance.')
  
  const { stats, statsLoading, statsIsCached, refetchStats } = useUnifiedChatSystem()
  
  return { 
    stats, 
    loading: statsLoading, 
    refetch: refetchStats,
    isCached: statsIsCached
  }
}