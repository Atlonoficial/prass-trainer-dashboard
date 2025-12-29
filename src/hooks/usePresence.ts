import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
  is_typing_in_conversation?: string | null
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map())
  const { user } = useAuth()

  // Atualizar presença do usuário atual
  const updatePresence = async (isOnline: boolean = true, typingInConversation?: string | null) => {
    if (!user) return
    
    try {
      await supabase.rpc('update_user_presence', {
        is_online_param: isOnline,
        typing_in_conversation_param: typingInConversation
      })
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  // Marcar como online
  const goOnline = () => updatePresence(true)
  
  // Marcar como offline
  const goOffline = () => updatePresence(false)
  
  // Iniciar/parar digitação
  const setTyping = (conversationId: string | null) => {
    updatePresence(true, conversationId)
  }

  // Verificar se usuário está online
  const isUserOnline = (userId: string): boolean => {
    const presence = onlineUsers.get(userId)
    if (!presence) return false
    
    // Considera offline se não foi visto há mais de 5 minutos
    const lastSeen = new Date(presence.last_seen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    
    return presence.is_online && diffMinutes < 5
  }

  // Verificar se usuário está digitando em conversa específica
  const isUserTyping = (userId: string, conversationId: string): boolean => {
    const presence = onlineUsers.get(userId)
    return presence?.is_typing_in_conversation === conversationId || false
  }

  // Configurar presença automaticamente
  useEffect(() => {
    if (!user) return

    // Marcar como online ao carregar
    goOnline()

    // Atualizar presença a cada 30 segundos
    const interval = setInterval(() => {
      goOnline()
    }, 30000)

    // Marcar como offline ao sair
    const handleBeforeUnload = () => {
      goOffline()
    }

    // Detectar quando a aba está ativa/inativa
    const handleVisibilityChange = () => {
      if (document.hidden) {
        goOffline()
      } else {
        goOnline()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      goOffline()
    }
  }, [user])

  // Escutar mudanças de presença em tempo real - OTIMIZADO
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const presence = payload.new as any
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (presence?.user_id) {
              setOnlineUsers(prev => new Map(prev.set(presence.user_id, presence as UserPresence)))
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setOnlineUsers(prev => {
              const newMap = new Map(prev)
              newMap.delete((payload.old as any).user_id)
              return newMap
            })
          }
        }
      )
      .subscribe()

    // Buscar presença inicial apenas uma vez
    const fetchInitialPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*')
        
        if (error) {
          console.warn('User presence table not available yet:', error)
          return
        }
        
        const presenceMap = new Map<string, UserPresence>()
        data?.forEach((presence: any) => {
          presenceMap.set(presence.user_id, presence as UserPresence)
        })
        setOnlineUsers(presenceMap)
      } catch (error) {
        console.warn('Error fetching initial presence:', error)
      }
    }

    fetchInitialPresence()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id]) // Mudança: usar user.id em vez de user completo

  return {
    onlineUsers,
    updatePresence,
    goOnline,
    goOffline,
    setTyping,
    isUserOnline,
    isUserTyping
  }
}