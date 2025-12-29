import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Student } from "@/hooks/useStudents"
import { Link } from "react-router-dom"
import { 
  MessageCircle,
  Dumbbell,
  Calendar,
  Mail,
  Phone,
  User,
  MoreVertical
} from "lucide-react"
import { getExpirationDisplay } from '@/lib/studentUtils'

interface StudentCardProps {
  student: Student
}

// COMPONENT: Card do Aluno no Dashboard do Professor
// CONEXÃO: Dados sincronizados com App do Aluno via onSnapshot
// AÇÕES: Link para detalhes, chat e criação de treinos

export function StudentCard({ student }: StudentCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={student.avatar || undefined} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{student.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status e Informações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
              {student.status}
            </Badge>
            <Badge variant="outline">{student.plan}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {student.mode}
          </span>
        </div>

        {/* Informações de Contato */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{student.email}</span>
          </div>
          {student.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{student.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{student.goal}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Expira em {getExpirationDisplay(student)}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/professor/aluno/${student.id}`}>
              <User className="h-3 w-3 mr-1" />
              Ver Detalhes
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/professor/chat/${student.id}`}>
              <MessageCircle className="h-3 w-3 mr-1" />
              Chat
            </Link>
          </Button>
          <Button size="sm" className="flex-1">
            <Dumbbell className="h-3 w-3 mr-1" />
            Treino
          </Button>
        </div>

        {/* Sincronização Info */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          💫 Dados sincronizados com App do Aluno em tempo real
        </div>
      </CardContent>
    </Card>
  )
}
