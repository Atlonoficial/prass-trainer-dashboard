import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

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

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchMessages = async (convId: string) => {
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
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const query = supabase.from('conversations').select('*').order('last_message_at', { ascending: false })
      const { data, error } = user
        ? await query.eq('teacher_id', user.id)
        : await query
      if (error) throw error
      setConversations((data || []) as Conversation[])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar as conversas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (
    conversationId: string,
    message: string,
    senderId: string,
    senderType: 'teacher' | 'student'
  ) => {
    if (sendingMessage) return // Prevenir envios duplicados

    setSendingMessage(true)
    try {
      // Inserir mensagem (triggers automáticos já atualizam contadores e last_message)
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

      // NOTA: Não atualizamos mais manualmente last_message - os triggers fazem isso automaticamente

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
  }

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId)

      if (error) throw error

      // Atualizar localmente
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, is_read: true } : m
      ))
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  const markConversationAsRead = async (conversationId: string, userType: 'teacher' | 'student') => {
    try {
      // DEPRECATED: Usar useUnifiedChatSystem.markConversationAsRead que usa função RPC otimizada
      console.warn('⚠️ useChat.markConversationAsRead está obsoleto. Use useUnifiedChatSystem.')

      // Usar função RPC otimizada
      const { error } = await supabase.rpc('mark_multiple_conversations_as_read', {
        conversation_ids: [conversationId],
        user_type: userType
      })

      if (error) throw error
    } catch (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }
  }

  const createConversation = async (studentId: string, teacherId: string) => {
    try {
      const id = `${teacherId}-${studentId}`
      const { error } = await supabase.from('conversations').insert([{ id, student_id: studentId, teacher_id: teacherId }])
      if (error) throw error
      return id
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar a conversa', variant: 'destructive' })
      throw error
    }
  }

  const getOrCreateConversation = async (studentId: string, teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
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
  }

  const clearConversation = async (conversationId: string) => {
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
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error

      // Atualizar estado local
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      setMessages([])

      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida com sucesso.',
      })
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a conversa.',
        variant: 'destructive'
      })
      throw error
    }
  }

  const sendBroadcastMessage = async (
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
        // Alunos que enviaram mensagem nos últimos 7 dias
        const { data: activeStudents, error } = await supabase
          .from('conversations')
          .select('student_id')
          .eq('teacher_id', user.id)
          .gte('last_message_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        if (error) throw error
        targetStudentIds = activeStudents?.map(s => s.student_id).filter(Boolean) || []
      } else if (recipientType === 'unread') {
        // Alunos com mensagens não lidas do professor
        const { data: unreadConversations, error } = await supabase
          .from('conversations')
          .select('student_id')
          .eq('teacher_id', user.id)
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

      // Enviar mensagem para cada aluno
      const promises = targetStudentIds.map(async (studentId) => {
        try {
          // Obter ou criar conversa
          const conversationId = await getOrCreateConversation(studentId, user.id)

          // Enviar mensagem
          await sendMessage(conversationId, `📢 ${subject}\n\n${message}`, user.id, 'teacher')
        } catch (error) {
          console.error(`Erro ao enviar para aluno ${studentId}:`, error)
        }
      })

      await Promise.all(promises)

      toast({
        title: 'Mensagens enviadas!',
        description: `Mensagem enviada para ${targetStudentIds.length} aluno${targetStudentIds.length !== 1 ? 's' : ''}`,
        variant: 'default'
      })

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
  }

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId)
    } else {
      fetchConversations()
    }
  }, [conversationId, user?.id])

  // Realtime subscriptions for chat - OTIMIZADO
  useEffect(() => {
    if (!conversationId && !user?.id) return

    if (conversationId) {
      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            setMessages((prev) => {
              // Evitar duplicatas
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const updated = payload.new as ChatMessage
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } else if (user?.id) {
      const channel = supabase
        .channel(`conversations-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversations', filter: `teacher_id=eq.${user.id}` },
          (payload) => {
            const newConv = payload.new as Conversation
            setConversations(prev => {
              // Evitar duplicatas
              if (prev.some(c => c.id === newConv.id)) return prev
              return [newConv, ...prev].sort((a, b) =>
                new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
              )
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `teacher_id=eq.${user.id}` },
          (payload) => {
            const updated = payload.new as Conversation
            setConversations(prev => {
              const updatedList = prev.map(c => c.id === updated.id ? updated : c)
              // Reordenar por última mensagem
              return updatedList.sort((a, b) =>
                new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
              )
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [conversationId, user?.id])

  return {
    messages,
    conversations,
    loading,
    sendingMessage,
    sendMessage,
    sendBroadcastMessage,
    clearConversation,
    deleteConversation,
    markAsRead,
    markConversationAsRead,
    createConversation,
    getOrCreateConversation,
    refetchMessages: conversationId ? () => fetchMessages(conversationId) : undefined,
    refetchConversations: fetchConversations,
  }
}
