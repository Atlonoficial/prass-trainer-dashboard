import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

// ============= TIPOS CONSOLIDADOS =============
export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: 'teacher' | 'student'
  message: string
  is_read?: boolean
  created_at: string
  delivered_at?: string
}

export interface Conversation {
  id: string
  student_id: string
  teacher_id: string
  last_message?: string | null
  last_message_at?: string | null
  unread_count_student?: number | null
  unread_count_teacher?: number | null
  created_at?: string | null
  updated_at?: string | null
  is_active?: boolean
}

export interface ChatStats {
  conversationsWithTeacherToday: number
  conversationsWithStudentsToday: number
  unreadTeacherMessages: number
  responseRate: number
  activeStudents: number
  totalConversations: number
}

interface CachedData<T> {
  data: T
  timestamp: number
  loading: boolean
}

// ============= CONSTANTES =============
const STATS_CACHE_DURATION = 30000 // 30 segundos
const UNREAD_CACHE_DURATION = 5000 // 5 segundos  
const DEBOUNCE_DELAY = 500 // 0.5 segundos para debounce (mais rápido)

/**
 * Hook unificado que centraliza toda a lógica de comunicação
 * Substitui: useChat, useCachedChatStats, useOptimizedUnreadCount, useConversationAutoRead
 */
export function useUnifiedChatSystem(conversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<ChatStats>({
    conversationsWithTeacherToday: 0,
    conversationsWithStudentsToday: 0,
    unreadTeacherMessages: 0,
    responseRate: 0,
    activeStudents: 0,
    totalConversations: 0
  })
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()

  // ============= CACHE REFS =============
  const statsCacheRef = useRef<CachedData<ChatStats> | null>(null)
  const unreadCacheRef = useRef<{ count: number, timestamp: number } | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const fetchingRef = useRef<{ stats: boolean, unread: boolean }>({ stats: false, unread: false })
  const lastFetchTimeRef = useRef<{ stats: number, unread: number }>({ stats: 0, unread: 0 })

  // ============= CONTADORES UNIFICADOS =============
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unread_count_teacher || 0), 0)
  }, [conversations])

  // ============= FUNÇÕES DE FETCH =============
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, sender_id, sender_type, message, created_at, is_read, delivered_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages((data || []) as ChatMessage[])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as mensagens', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true) // Filtro padronizado
        .order('last_message_at', { ascending: false })

      if (error) throw error
      setConversations((data || []) as Conversation[])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as conversas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, toast])

  const fetchStats = useCallback(async (skipCache = false) => {
    if (!user?.id) return

    const now = Date.now()

    // Rate limiting
    if (now - lastFetchTimeRef.current.stats < 1000 && !skipCache) {
      console.log('Rate limited: skipping stats fetch')
      return
    }

    // Verificar cache primeiro
    if (!skipCache && statsCacheRef.current && (now - statsCacheRef.current.timestamp) < STATS_CACHE_DURATION) {
      console.log('Using cached chat stats')
      setStats(statsCacheRef.current.data)
      return
    }

    // Evitar chamadas simultâneas
    if (fetchingRef.current.stats) {
      console.log('Stats fetch already in progress, skipping')
      return
    }

    fetchingRef.current.stats = true
    lastFetchTimeRef.current.stats = now

    try {
      console.log('Fetching fresh chat stats for user:', user.id)

      // Usar função otimizada
      const { data, error } = await supabase.rpc('get_teacher_chat_stats_optimized', {
        teacher_id_param: user.id
      })

      if (error) {
        console.error('Error fetching chat stats:', error)
        return
      }

      const result = data as any
      const newStats: ChatStats = {
        conversationsWithTeacherToday: result.conversations_with_teacher_messages || 0,
        conversationsWithStudentsToday: result.conversations_with_student_messages || 0,
        unreadTeacherMessages: result.unread_teacher_messages || 0,
        responseRate: result.response_rate || 0,
        activeStudents: result.active_students_count || 0,
        totalConversations: result.total_conversations_count || 0
      }

      // Atualizar cache
      statsCacheRef.current = {
        data: newStats,
        timestamp: now,
        loading: false
      }

      setStats(newStats)
      console.log('Chat stats updated:', newStats)
    } catch (error) {
      console.error('Error fetching chat stats:', error)
    } finally {
      fetchingRef.current.stats = false
    }
  }, [user?.id])

  // ============= FUNÇÕES DE ESCRITA =============
  const sendMessage = useCallback(async (
    conversationId: string,
    message: string,
    senderId: string,
    senderType: 'teacher' | 'student'
  ) => {
    if (sendingMessage) return

    setSendingMessage(true)
    try {
      // Inserir mensagem (triggers automáticos irão atualizar contadores e last_message)
      const { data: newMessage, error: msgErr } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          sender_type: senderType,
          message
        }])
        .select()
        .single()

      if (msgErr) throw msgErr

      // Auto-marcar mensagem como entregue quando for do professor
      if (senderType === 'teacher' && newMessage) {
        await supabase
          .from('chat_messages')
          .update({ delivered_at: new Date().toISOString() })
          .eq('id', newMessage.id)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem. Tente novamente.',
        variant: 'destructive'
      })
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [sendingMessage, toast])

  const markConversationAsRead = useCallback(async (
    conversationId: string,
    roleType: 'teacher' | 'student' = 'teacher'
  ) => {
    if (!user?.id) return

    try {
      console.log(`[markConversationAsRead] Marcando como lida (${roleType}):`, conversationId)

      // Usar função RPC otimizada para marcar como lida
      const { error } = await supabase.rpc('mark_multiple_conversations_as_read', {
        conversation_ids: [conversationId],
        user_type: roleType
      })

      if (error) throw error

      // Atualizar conversas localmente
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? {
            ...conv,
            unread_count_teacher: roleType === 'teacher' ? 0 : conv.unread_count_teacher,
            unread_count_student: roleType === 'student' ? 0 : conv.unread_count_student
          }
          : conv
      ))

      // Invalidar cache de stats
      statsCacheRef.current = null
      fetchStats(true)

      console.log('Conversation marked as read successfully')
    } catch (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }
  }, [user?.id, fetchStats])

  const createConversation = useCallback(async (studentId: string, teacherId: string) => {
    try {
      const id = `${teacherId}-${studentId}`
      const { error } = await supabase.from('conversations').insert([{
        id,
        student_id: studentId,
        teacher_id: teacherId,
        is_active: true
      }])
      if (error) throw error
      return id
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar a conversa', variant: 'destructive' })
      throw error
    }
  }, [toast])

  const getOrCreateConversation = useCallback(async (studentId: string, teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .eq('is_active', true) // Filtro padronizado
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (data?.id) return data.id
      const newId = await createConversation(studentId, teacherId)
      return newId
    } catch (error) {
      console.error('Error getting/creating conversation:', error)
      toast({ title: 'Erro', description: 'Não foi possível recuperar ou criar a conversa', variant: 'destructive' })
      throw error
    }
  }, [createConversation, toast])

  const clearConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase.rpc('clear_conversation_messages', {
        p_conversation_id: conversationId
      })

      if (error) throw error

      // Limpar mensagens localmente
      setMessages([])

      // Refetch conversas para atualizar contadores
      await fetchConversations()

      toast({
        title: 'Conversa limpa!',
        description: 'Todas as mensagens foram removidas.',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error clearing conversation:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar a conversa. Tente novamente.',
        variant: 'destructive'
      })
      throw error
    }
  }, [fetchConversations, toast])

  // ============= BROADCAST MESSAGE =============
  const sendBroadcastMessage = useCallback(async (
    recipientType: 'all' | 'active' | 'unread' | 'custom',
    message: string,
    subject: string,
    customRecipients?: string[]
  ) => {
    if (!user?.id || sendingMessage) return

    setSendingMessage(true)
    try {
      let targetStudentIds: string[] = []

      // Determinar destinatários baseado no tipo
      if (recipientType === 'all') {
        const { data: students, error } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id)
          .not('user_id', 'is', null)
        if (error) throw error
        targetStudentIds = students?.map(s => s.user_id).filter(Boolean) || []
      } else if (recipientType === 'active') {
        // CORREÇÃO: Buscar em students.last_activity ao invés de conversations.last_message_at
        const { data: activeStudents, error } = await supabase
          .from('students')
          .select('user_id')
          .eq('teacher_id', user.id)
          .not('user_id', 'is', null)
          .gte('last_activity', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        if (error) throw error
        targetStudentIds = activeStudents?.map(s => s.user_id).filter(Boolean) || []
      } else if (recipientType === 'unread') {
        const { data: unreadConversations, error } = await supabase
          .from('conversations')
          .select('student_id')
          .eq('teacher_id', user.id)
          .eq('is_active', true) // Filtro padronizado
          .gt('unread_count_student', 0)
        if (error) throw error
        targetStudentIds = unreadConversations?.map(s => s.student_id).filter(Boolean) || []
      } else if (recipientType === 'custom' && customRecipients) {
        targetStudentIds = customRecipients
      }

      if (targetStudentIds.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhum destinatário encontrado para envio.',
          variant: 'default'
        })
        return
      }

      // Enviar mensagem para cada aluno usando Promise.allSettled para melhor tratamento de erros
      const promises = targetStudentIds.map(async (studentId) => {
        const conversationId = await getOrCreateConversation(studentId, user.id)
        await sendMessage(conversationId, `${subject}\n\n${message}`, user.id, 'teacher')
        return studentId
      })

      const results = await Promise.allSettled(promises)

      // Contar sucessos e falhas
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failureCount = results.filter(r => r.status === 'rejected').length

      if (failureCount > 0) {
        toast({
          title: 'Mensagens enviadas parcialmente',
          description: `${successCount} mensagem${successCount !== 1 ? 's' : ''} enviada${successCount !== 1 ? 's' : ''} com sucesso, ${failureCount} falha${failureCount !== 1 ? 's' : ''}`,
          variant: 'default'
        })
      } else {
        toast({
          title: 'Mensagens enviadas!',
          description: `Mensagem enviada para ${successCount} aluno${successCount !== 1 ? 's' : ''}`,
          variant: 'default'
        })
      }

    } catch (error) {
      console.error('Error sending broadcast message:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar as mensagens. Tente novamente.',
        variant: 'destructive'
      })
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [user?.id, sendingMessage, getOrCreateConversation, sendMessage, toast])

  // ============= EFFECTS =============
  // Fetch inicial
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId)
    } else {
      fetchConversations()
    }
    fetchStats()
  }, [conversationId, user?.id, fetchMessages, fetchConversations, fetchStats])

  // Subscription consolidada com debounce e melhor sincronização
  useEffect(() => {
    if (!user?.id) return

    const debouncedRefresh = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        console.log('[CHAT] Debounced refresh triggered')
        fetchConversations()
        fetchStats(true)
      }, DEBOUNCE_DELAY)
    }

    if (conversationId) {
      console.log('[CHAT] Setting up subscription for conversation:', conversationId)

      // Canal para mensagens específicas da conversa com melhor sincronização
      const messageChannel = supabase
        .channel(`unified-chat-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            console.log('[CHAT] New message received:', newMsg)
            setMessages((prev) => {
              // Better deduplication - check both ID and content
              const isDuplicate = prev.some(m =>
                m.id === newMsg.id ||
                (m.message === newMsg.message && m.sender_id === newMsg.sender_id &&
                  Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000)
              )
              if (isDuplicate) {
                console.log('[CHAT] Duplicate message detected, skipping')
                return prev
              }
              console.log('[CHAT] Adding new message to state')
              return [...prev, newMsg].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const updated = payload.new as ChatMessage
            console.log('[CHAT] Message updated:', updated.id)
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          }
        )
        .subscribe((status) => {
          console.log('[CHAT] Message subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('[CHAT] Message subscription active for:', conversationId)
            // Messages already loaded in initial useEffect - no refetch needed
          }
        })

      return () => {
        console.log('[CHAT] Removing message subscription for:', conversationId)
        supabase.removeChannel(messageChannel)
      }
    } else {
      // Canal consolidado para conversas e estatísticas
      const consolidatedChannel = supabase
        .channel(`unified-system-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations', filter: `teacher_id=eq.${user.id}` },
          (payload) => {
            console.log('Conversation change detected:', payload.eventType)
            if (payload.eventType === 'INSERT') {
              const newConv = payload.new as Conversation
              setConversations(prev => {
                if (prev.some(c => c.id === newConv.id)) return prev
                return [newConv, ...prev].sort((a, b) =>
                  new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
                )
              })
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Conversation
              setConversations(prev => {
                const updatedList = prev.map(c => c.id === updated.id ? updated : c)
                return updatedList.sort((a, b) =>
                  new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
                )
              })
            }
            debouncedRefresh()
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            console.log('Message insert detected')
            debouncedRefresh()
          }
        )
        .subscribe()

      return () => {
        console.log('Cleaning up unified subscriptions')
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
        supabase.removeChannel(consolidatedChannel)
      }
    }
  }, [conversationId, user?.id, fetchConversations, fetchStats])

  // ============= RETORNO CONSOLIDADO =============
  return {
    // Mensagens
    messages,

    // Conversas
    conversations,

    // Estatísticas
    stats,
    statsLoading: loading,
    statsIsCached: statsCacheRef.current && (Date.now() - statsCacheRef.current.timestamp) < STATS_CACHE_DURATION,

    // Contadores
    unreadCount,

    // Estados
    loading,
    sendingMessage,

    // Funções de mensagens
    sendMessage,
    sendBroadcastMessage,

    // Funções de conversas
    markConversationAsRead,
    createConversation,
    getOrCreateConversation,
    clearConversation,

    // Funções de refresh
    refetchMessages: conversationId ? () => fetchMessages(conversationId) : undefined,
    refetchConversations: fetchConversations,
    refetchStats: () => fetchStats(true),
  }
}