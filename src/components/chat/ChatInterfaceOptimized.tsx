import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUnifiedChatSystem, ChatMessage } from '@/hooks/useUnifiedChatSystem'
import { usePresence } from '@/hooks/usePresence'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { 
  Send, 
  MoreVertical, 
  MessageCircle,
  Loader2,
  Trash2
} from 'lucide-react'

interface Student {
  id: string
  user_id: string
  name: string
  email: string
  avatar?: string
  status?: string
}

interface ChatInterfaceProps {
  student: Student | null
  onBack?: () => void
}

// Componente memoizado para as bolhas de mensagem
const MessageBubble = React.memo(({ 
  message, 
  student, 
  isFromTeacher 
}: {
  message: ChatMessage
  student: Student
  isFromTeacher: boolean
}) => {
  const getMessageStatus = useMemo(() => {
    if (!isFromTeacher) return null
    
    if (message.is_read) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>
      )
    } else if (message.delivered_at) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        </div>
      )
    } else {
      return (
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
      )
    }
  }, [isFromTeacher, message.is_read, message.delivered_at])

  const messageTime = useMemo(() => 
    new Date(message.created_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }), [message.created_at]
  )

  return (
    <div className={`flex ${isFromTeacher ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[70%] ${
        isFromTeacher ? 'flex-row-reverse' : 'flex-row'
      }`}>
        <Avatar className="h-4 w-4 shrink-0">
          {isFromTeacher ? (
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">P</AvatarFallback>
          ) : (
            <>
              <AvatarImage src={student.avatar} />
              <AvatarFallback className="text-xs">{student.name.charAt(0)}</AvatarFallback>
            </>
          )}
        </Avatar>
        <div className={`rounded-2xl px-3 py-2 max-w-full border ${
          isFromTeacher 
            ? 'bg-blue-500/10 border-blue-500/20 text-foreground rounded-br-sm' 
            : 'bg-muted border-border text-foreground rounded-bl-sm'
        }`}>
          <p className="text-sm break-words">{message.message}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <p className="text-xs opacity-70">{messageTime}</p>
            {getMessageStatus}
          </div>
        </div>
      </div>
    </div>
  )
})
MessageBubble.displayName = 'MessageBubble'

export function ChatInterface({ student, onBack }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [convId, setConvId] = useState<string | undefined>(undefined)
  const { 
    messages, 
    loading, 
    sendingMessage, 
    sendMessage, 
    markConversationAsRead, 
    clearConversation,
    getOrCreateConversation
  } = useUnifiedChatSystem(convId)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // PERFORMANCE OPTIMIZATIONS: Use refs to avoid excessive re-renders
  const userIdRef = useRef(user?.id)
  const studentIdRef = useRef(student?.user_id)
  
  // Update refs only when values actually change
  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])
  
  useEffect(() => {
    studentIdRef.current = student?.user_id
  }, [student?.user_id])

  // MEMOIZED: Combined messages (real + optimistic) with deduplication
  const allMessages = useMemo(() => {
    const combined = [...messages, ...optimisticMessages]
    const unique = combined.filter((msg, index, arr) => 
      arr.findIndex(m => m.message === msg.message && m.sender_id === msg.sender_id && 
        Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000) === index
    )
    return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [messages, optimisticMessages])

  // Scroll para última mensagem - optimized with dependency array
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (allMessages.length > 0) {
      scrollToBottom()
    }
  }, [allMessages.length, scrollToBottom])

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !userIdRef.current || !convId) return
    
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: convId,
      sender_id: userIdRef.current,
      sender_type: 'teacher',
      message: messageText.trim(),
      created_at: new Date().toISOString(),
      is_read: false
    }

    // 1. OPTIMISTIC UI: Add message immediately to UI
    console.log('[CHAT] Adding optimistic message:', optimisticMessage)
    setOptimisticMessages(prev => [...prev, optimisticMessage])
    
    // 2. Save the message text before clearing
    const messageToSend = messageText.trim()
    setSending(true)
    
    try {
      // 3. Send the message to server
      console.log('[CHAT] Sending message to server:', messageToSend)
      await sendMessage(convId, messageToSend, userIdRef.current, 'teacher')
      
      // 4. ONLY clear input after successful send
      setMessageText('')
      console.log('[CHAT] Message sent successfully, input cleared')
      
      // 5. Remove optimistic message after 2 seconds (real message should appear)
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
      }, 2000)
      
      // 6. Fallback sync check - if real message doesn't appear, retry
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      syncTimeoutRef.current = setTimeout(() => {
        console.log('[CHAT] Message sync timeout, checking for real message...')
        setOptimisticMessages(prev => {
          const stillOptimistic = prev.find(msg => msg.id === tempId)
          if (stillOptimistic) {
            console.log('[CHAT] Real message not found, keeping optimistic message')
          }
          return prev
        })
      }, 3000)
      
    } catch (error) {
      console.error('[CHAT] Error sending message:', error)
      // 7. On error, keep the text in input and remove optimistic message
      setMessageText(messageToSend)
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId))
    } finally {
      setSending(false)
    }
  }, [messageText, convId, sendMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleClearConversation = useCallback(async () => {
    if (!convId || messages.length === 0) return
    
    const confirmed = window.confirm(
      'Tem certeza que deseja limpar todas as mensagens desta conversa? Esta ação não pode ser desfeita.'
    )
    
    if (confirmed) {
      try {
        await clearConversation(convId)
      } catch (error) {
        console.error('Erro ao limpar conversa:', error)
      }
    }
  }, [convId, clearConversation, messages.length])

  // OPTIMIZED: Initialize conversation only when needed
  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      if (!userIdRef.current || !studentIdRef.current) return
      
      try {
        const id = await getOrCreateConversation(studentIdRef.current, userIdRef.current)
        if (mounted) {
          setConvId(id)
          
          // Auto-mark as read after initialization
          setTimeout(() => {
            if (mounted) {
              markConversationAsRead(id)
            }
          }, 1000)
        }
      } catch (e) {
        console.error('Erro ao obter/criar conversa:', e)
      }
    }

    init()
    
    return () => {
      mounted = false
    }
  }, [userIdRef.current, studentIdRef.current, getOrCreateConversation, markConversationAsRead])

  // OPTIMIZED: Real-time updates with cleanup
  useEffect(() => {
    if (!convId) return

    const channel = supabase
      .channel(`chat-updates-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          
          // Auto-mark student messages as delivered
          if (newMessage.sender_type === 'student') {
            setTimeout(async () => {
              try {
                await supabase
                  .from('chat_messages')
                  .update({ delivered_at: new Date().toISOString() })
                  .eq('id', newMessage.id)
              } catch (error) {
                console.error('Error marking message as delivered:', error)
              }
            }, 500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [convId])

  // MEMOIZED: Student status to avoid recalculations
  const studentInfo = useMemo(() => {
    if (!student) return null
    
    return {
      name: student.name,
      avatar: student.avatar,
      initial: student.name.charAt(0)
    }
  }, [student?.name, student?.avatar])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  if (!student || !studentInfo) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Selecione uma conversa</h3>
          <p className="text-muted-foreground">Escolha um aluno para iniciar a conversa</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header - Optimized */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={studentInfo.avatar} />
              <AvatarFallback>{studentInfo.initial}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{studentInfo.name}</h3>
            <p className="text-xs text-muted-foreground">Chat ativo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearConversation}
            disabled={!convId || messages.length === 0}
            title="Limpar conversa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area - Optimized with Fixed Height and Scroll */}
      <ScrollArea className="flex-1 h-[400px] min-h-[300px] max-h-[600px] p-0">
        <div className="space-y-4 p-3 md:p-4 pb-4 min-h-full scroll-smooth">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
              <p className="text-muted-foreground">Inicie a conversa com {studentInfo.name}</p>
            </div>
          ) : (
            <>
              {/* Visual indicator for scroll history */}
              {allMessages.length > 5 && (
                <div className="text-center pb-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1 inline-block">
                    {allMessages.length} mensagens • Role para ver o histórico
                  </div>
                </div>
              )}
              
              {/* OPTIMIZED: Render combined messages (real + optimistic) */}
              {allMessages.map((message) => (
                <div key={message.id} className={message.id.startsWith('temp_') ? 'opacity-75' : ''}>
                  <MessageBubble
                    message={message}
                    student={student}
                    isFromTeacher={message.sender_type === 'teacher'}
                  />
                  {message.id.startsWith('temp_') && (
                    <div className="flex justify-end">
                      <div className="text-xs text-muted-foreground mr-4 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Enviando...
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Optimized */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder={`Mensagem para ${studentInfo.name}...`}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || sendingMessage}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending || sendingMessage || !convId}
            size="sm"
            className="shrink-0"
          >
            {sending || sendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}