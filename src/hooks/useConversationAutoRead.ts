import { useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useConversationAutoRead() {
  const { user } = useAuth()

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return

    try {
      console.log('Auto-marking conversation as read:', conversationId)
      
      // OTIMIZADO: Usar função RPC que faz tudo em uma transação
      const { error } = await supabase.rpc('mark_multiple_conversations_as_read', {
        conversation_ids: [conversationId],
        user_type: 'teacher'
      })

      if (error) {
        console.error('Error updating conversation:', error)
        return
      }

      console.log('Successfully marked conversation as read')
    } catch (error) {
      console.error('Error in markConversationAsRead:', error)
    }
  }, [user?.id])

  return { markConversationAsRead }
}