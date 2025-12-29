import { useUnifiedChatSystem } from './useUnifiedChatSystem'

export function useOptimizedUnreadCount() {
  // DEPRECATED: Este hook foi consolidado no useUnifiedChatSystem
  console.warn('⚠️ useOptimizedUnreadCount está obsoleto. Use useUnifiedChatSystem para melhor performance.')
  
  const { unreadCount, loading, markConversationAsRead, refetchConversations } = useUnifiedChatSystem()
  
  return { 
    unreadCount, 
    loading, 
    refetch: refetchConversations,
    markConversationAsRead
  }

}