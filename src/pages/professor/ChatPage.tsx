import { useParams, Link, useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useStudents } from "@/hooks/useStudents"
import { useChat } from "@/hooks/useChat"
import { useAuth } from "@/hooks/useAuth"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Trash2,
  Eraser,
  User
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

// PÁGINA: Chat com Aluno
// CONEXÃO: Mesma coleção 'messages' e 'conversations' do App do Aluno
// SINCRONIZAÇÃO: onSnapshot bidirecional - professor e aluno veem mensagens em tempo real
// Hook useChat espelhado entre Dashboard e App do Aluno

export default function ChatPage() {
  const { conversationId: studentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { students } = useStudents()
  const [convId, setConvId] = useState<string | undefined>(undefined)
  const { messages, sendMessage, loading, getOrCreateConversation, deleteConversation, clearConversation } = useChat(convId)
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Encontra o aluno desta conversa
  const student = students.find(s => s.id === studentId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const init = async () => {
      if (!user || !studentId) return
      try {
        const id = await getOrCreateConversation(studentId, user.id)
        setConvId(id)
      } catch (e) {
        console.error('Erro ao obter/criar conversa:', e)
      }
    }
    init()
  }, [user, studentId, getOrCreateConversation])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !convId) return

    setSending(true)
    try {
      // SINCRONIZAÇÃO: Esta mensagem aparecerá no App do Aluno em tempo real
      await sendMessage(convId, messageText, user.id, 'teacher')
      setMessageText("")
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!convId) return
    try {
      await deleteConversation(convId)
      navigate('/professor/dashboard')
    } catch (error) {
      console.error('Erro ao excluir conversa:', error)
    }
  }

  const handleClearMessages = async () => {
    if (!convId) return
    try {
      await clearConversation(convId)
    } catch (error) {
      console.error('Erro ao limpar mensagens:', error)
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Conversa não encontrada</h2>
          <Button asChild>
            <Link to="/professor/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 pb-32 h-screen flex flex-col">
      {/* Header da Conversa */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/professor/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={student.avatar} />
            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold">{student.name}</h1>
            <div className="flex items-center gap-2">
              <Badge
                variant={student.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {student.status}
              </Badge>
              <span className="text-sm text-muted-foreground">Online agora</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso apagará todo o histórico com este usuário e removerá a conversa da lista.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClearMessages}>
                <Eraser className="mr-2 h-4 w-4" />
                Limpar Mensagens
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
                <User className="mr-2 h-4 w-4" />
                Dados do Contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Área de Mensagens */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
              <p className="text-muted-foreground">
                Inicie a conversa com {student.name}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[70%] ${message.sender_type === 'teacher' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                  <Avatar className="h-6 w-6">
                    {message.sender_type === 'teacher' ? (
                      <AvatarFallback className="text-xs">P</AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="text-xs">{student.name.charAt(0)}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className={`rounded-lg px-3 py-2 ${message.sender_type === 'teacher'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                    }`}>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input de Mensagem */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder={`Enviar mensagem para ${student.name}...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending || !convId}
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
    </div>
  )
}