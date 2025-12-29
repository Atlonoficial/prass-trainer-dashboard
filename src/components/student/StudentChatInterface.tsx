import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useUnifiedChatSystem } from '@/hooks/useUnifiedChatSystem'
import { usePresence } from '@/hooks/usePresence'
import { OnlineIndicator } from '@/components/chat/OnlineIndicator'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Send, MessageCircle } from 'lucide-react'

export function StudentChatInterface() {
  const { user } = useAuth()
  const { 
    conversations, 
    messages, 
    sendMessage, 
    markConversationAsRead,
    loading 
  } = useUnifiedChatSystem()
  
  const { isUserOnline, isUserTyping, onlineUsers } = usePresence()
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Aluno sempre tem apenas 1 conversa (com seu professor)
  const conversation = conversations[0]
  const teacherId = conversation?.teacher_id

  const getLastSeenText = () => {
    if (!teacherId) return 'Offline'
    const presence = onlineUsers.get(teacherId)
    if (!presence || !presence.last_seen) return 'Offline'
    
    const lastSeen = new Date(presence.last_seen)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Online agora'
    if (diffMinutes < 60) return `Visto há ${diffMinutes}min`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Visto há ${diffHours}h`
    
    const diffDays = Math.floor(diffHours / 24)
    return `Visto há ${diffDays}d`
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-marcar como lida quando abrir a conversa
  useEffect(() => {
    if (conversation?.id && conversation.unread_count_student > 0) {
      markConversationAsRead(conversation.id, 'student')
    }
  }, [conversation?.id])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !conversation?.id) return
    
    setSending(true)
    try {
      await sendMessage(conversation.id, messageText, user.id, 'student')
      setMessageText('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!conversation) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="text-center py-12">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma conversa encontrada</h3>
          <p className="text-muted-foreground">
            Entre em contato com seu professor para iniciar uma conversa
          </p>
        </CardContent>
      </Card>
    )
  }

  const teacherOnline = teacherId ? isUserOnline(teacherId) : false
  const teacherTyping = teacherId && conversation.id 
    ? isUserTyping(teacherId, conversation.id) 
    : false

  return (
    <Card className="bg-card border-border flex flex-col h-[calc(100vh-18rem)]">
      {/* Header da Conversa */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            {teacherId && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineIndicator userId={teacherId} />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Meu Professor</h3>
            <div className="flex items-center gap-2">
              {teacherOnline ? (
                <span className="text-xs text-green-600 font-medium">
                  Online agora
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {getLastSeenText()}
                </span>
              )}
              {teacherTyping && (
                <span className="text-xs text-muted-foreground ml-2">digitando...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
            <p className="text-muted-foreground">
              Envie uma mensagem para seu professor
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender_type === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[70%] ${
                message.sender_type === 'student' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-xs">
                    {message.sender_type === 'student' ? 'A' : 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className={`rounded-2xl px-3 py-2 border ${
                  message.sender_type === 'student' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-foreground' 
                    : 'bg-muted border-border text-foreground'
                }`}>
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Mensagens sincronizadas em tempo real
        </p>
      </div>
    </Card>
  )
}
