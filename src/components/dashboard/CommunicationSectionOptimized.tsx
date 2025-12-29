import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useUnifiedChatSystem } from '@/hooks/useUnifiedChatSystem';
import { usePresence } from '@/hooks/usePresence';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/hooks/useAuth';
import { ChatPerformanceIndicator } from '@/components/chat/ChatPerformanceIndicator';
import { Plus, Send, Users, MessageSquare, Mail, Search, X, Loader2, Activity } from 'lucide-react';
import { NewMessageModal } from '@/components/chat/NewMessageModal';

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Componente memoizado para conversa individual
const ConversationItem = React.memo(({
  conversation,
  student,
  isOnline,
  isSelected,
  hasUnread,
  onClick
}: {
  conversation: any;
  student: any;
  isOnline: boolean;
  isSelected: boolean;
  hasUnread: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`flex items-center space-x-3 p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${isSelected ? 'bg-muted/50 border-r-2 border-r-primary' : ''
      }`}
  >
    <div className="relative">
      <Avatar className="h-10 w-10">
        <AvatarImage src={student.avatar} />
        <AvatarFallback>{student.name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      {isOnline && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-foreground font-medium truncate">{student.name}</p>
          {hasUnread && (
            <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
              {conversation.unread_count_teacher}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {conversation.last_message_at && (
            <span className="text-muted-foreground text-xs">
              {new Date(conversation.last_message_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-sm truncate">
        {conversation.last_message ? (
          <>
            {/* Se a última mensagem foi enviada pelo professor */}
            {conversation.last_message_at && new Date(conversation.last_message_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) &&
              conversation.unread_count_teacher === 0 ? (
              <span className="text-primary font-medium">Você: </span>
            ) : null}
            {conversation.last_message.length > 50
              ? `${conversation.last_message.substring(0, 50)}...`
              : conversation.last_message}
          </>
        ) : (
          'Nenhuma mensagem'
        )}
      </p>
    </div>
  </div>
));
ConversationItem.displayName = 'ConversationItem';

export default function CommunicationSection() {
  const { user } = useAuth()
  const { students, loading: studentsLoading } = useStudents()
  const { isUserOnline } = usePresence()

  // Hook unificado que substitui todos os outros
  const {
    stats,
    statsLoading,
    statsIsCached,
    conversations,
    loading: conversationsLoading,
    unreadCount: globalUnreadCount,
    sendBroadcastMessage,
    sendingMessage,
    markConversationAsRead: markGlobalAsRead
  } = useUnifiedChatSystem()

  const [selectedTab, setSelectedTab] = useState('conversations')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [messageText, setMessageText] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastType, setBroadcastType] = useState<'all' | 'active' | 'unread'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)

  // Debounce search query para evitar re-renders excessivos
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Filtrar estudantes baseado na busca com memoização
  const filteredStudents = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return students
    const query = debouncedSearchQuery.toLowerCase()
    return students.filter(student =>
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    )
  }, [students, debouncedSearchQuery])

  // Encontrar aluno da conversa selecionada com memoização
  const selectedStudentData = useMemo(() => {
    if (!selectedConversation) return null
    const conversation = conversations.find(c => c.id === selectedConversation)
    if (!conversation) return null
    return students.find(s => s.user_id === conversation.student_id) || null
  }, [selectedConversation, conversations, students])

  // Callbacks memoizados
  const handleStartConversation = useCallback((student: any) => {
    const studentWithUserId = {
      ...student,
      user_id: student.user_id || student.id
    }

    setSelectedStudent(studentWithUserId)

    const existingConversation = conversations.find(c => c.student_id === student.user_id)
    setSelectedConversation(existingConversation?.id || null)
    setSelectedTab('conversations')
  }, [conversations])

  const handleSendBroadcastMessage = useCallback(async () => {
    if (!broadcastMessage.trim() || !broadcastSubject.trim() || !user) return

    try {
      await sendBroadcastMessage(broadcastType, broadcastMessage, broadcastSubject)
      setBroadcastMessage('')
      setBroadcastSubject('')
      setBroadcastType('all')
    } catch (error) {
      console.error('Erro ao enviar mensagem em massa:', error)
    }
  }, [broadcastMessage, broadcastSubject, broadcastType, user, sendBroadcastMessage])

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    setSelectedConversation(conversationId)
    setSelectedStudent(null)

    // Auto-marcar conversa como lida quando selecionada
    try {
      await markGlobalAsRead(conversationId)
      console.log('Conversation marked as read on selection:', conversationId)
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }, [markGlobalAsRead])

  const handleBack = useCallback(() => {
    setSelectedConversation(null)
    setSelectedStudent(null)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Comunicação</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Gerencie todas as conversas e mensagens com seus alunos</p>
            <ChatPerformanceIndicator
              isLoading={statsLoading}
              isCached={statsIsCached}
              className="ml-2"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Button
              onClick={() => setIsNewMessageModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Mensagem
            </Button>
            {globalUnreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {globalUnreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onSelectStudent={handleStartConversation}
        students={students}
      />

      {/* Communication Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Conversas Respondidas Hoje</p>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-lg font-bold text-foreground">...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-foreground">{stats.conversationsWithTeacherToday}</p>
                    {statsIsCached && <span className="text-xs text-muted-foreground">📋</span>}
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">
                    {stats.conversationsWithTeacherToday === 0 ? 'Nenhuma conversa hoje' : 'alunos atendidos'}
                  </p>
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Suas Mensagens Não Lidas</p>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-lg font-bold text-foreground">...</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{stats.unreadTeacherMessages}</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    {stats.unreadTeacherMessages === 0 ? 'Todos viram suas mensagens' : 'mensagens não visualizadas'}
                  </p>
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Taxa de Resposta</p>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-lg font-bold text-foreground">...</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{stats.responseRate}%</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    {stats.responseRate === 0 ? 'Sem dados' : 'taxa de resposta hoje'}
                  </p>
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Alunos Ativos</p>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-lg font-bold text-foreground">...</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{stats.activeStudents}</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    {stats.activeStudents === 0 ? 'Nenhum aluno online' : 'online agora'}
                  </p>
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-info" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-card p-1 rounded-lg w-fit border border-border">
        <button
          onClick={() => setSelectedTab('conversations')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedTab === 'conversations'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Conversas
        </button>
        <button
          onClick={() => setSelectedTab('broadcast')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedTab === 'broadcast'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Envio em Massa
        </button>
      </div>

      {/* Conversations Tab */}
      {selectedTab === 'conversations' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="bg-card border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Conversas</h3>
              <p className="text-sm text-muted-foreground">
                {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conversa ainda</h3>
                  <p className="text-muted-foreground">As conversas com seus alunos aparecerão aqui</p>
                </div>
              ) : (
                conversations.map(conversation => {
                  const student = students.find(s => s.user_id === conversation.student_id)
                  if (!student) return null

                  const isOnline = isUserOnline(student.user_id)
                  const isSelected = selectedConversation === conversation.id
                  const hasUnread = (conversation.unread_count_teacher || 0) > 0

                  return (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      student={student}
                      isOnline={isOnline}
                      isSelected={isSelected}
                      hasUnread={hasUnread}
                      onClick={() => handleConversationSelect(conversation.id)}
                    />
                  )
                })
              )}
            </div>
          </Card>

          {/* Chat Interface */}
          <div className="xl:col-span-2">
            <ChatInterface
              student={selectedStudent || selectedStudentData}
              onBack={handleBack}
            />
          </div>
        </div>
      )}

      {/* Broadcast Tab */}
      {selectedTab === 'broadcast' && (
        <Card className="bg-card border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Envio em Massa</h3>
            <p className="text-sm text-muted-foreground mt-1">Envie mensagens para múltiplos alunos</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-foreground font-medium mb-2">Destinatários</label>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={broadcastType === 'all' ? 'default' : 'outline'}
                  onClick={() => setBroadcastType('all')}
                >
                  Todos os Alunos ({students.length})
                </Button>
                <Button
                  variant={broadcastType === 'active' ? 'default' : 'outline'}
                  onClick={() => setBroadcastType('active')}
                >
                  Alunos Ativos ({stats.activeStudents})
                </Button>
                <Button
                  variant={broadcastType === 'unread' ? 'default' : 'outline'}
                  onClick={() => setBroadcastType('unread')}
                >
                  Alunos com Mensagens Não Lidas
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-foreground font-medium mb-2">Título</label>
              <Input
                placeholder="Assunto da mensagem"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-2">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem aqui..."
                rows={6}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSendBroadcastMessage}
                disabled={!broadcastMessage.trim() || !broadcastSubject.trim() || sendingMessage}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {sendingMessage ? 'Enviando...' : 'Enviar Agora'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}