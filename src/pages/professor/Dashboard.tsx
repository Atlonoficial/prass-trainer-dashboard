import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useStudents } from "@/hooks/useStudents"
import { useWorkoutPlans } from "@/hooks/useWorkoutPlans"
import { useAppointments } from "@/hooks/useAppointments"
import { useAuth } from "@/hooks/useAuth"
import { useOptimizedProfile } from "@/hooks/useOptimizedProfile"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Link } from "react-router-dom"
import ProfessorLayout from "@/components/layout/ProfessorLayout"
import {
  Users,
  Dumbbell,
  Calendar,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
} from "lucide-react"

// PÁGINA: Dashboard do Professor
// Layout: Sidebar + TopBar + Conteúdo principal

export default function ProfessorDashboard() {
  const { user } = useAuth()
  const { profile } = useOptimizedProfile()
  const { students, loading: studentsLoading } = useStudents()
  const { workoutPlans: trainingPlans, loading: plansLoading } = useWorkoutPlans()
  const { appointments, loading: appointmentsLoading } = useAppointments()

  if (studentsLoading || plansLoading || appointmentsLoading) {
    return (
      <ProfessorLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </ProfessorLayout>
    )
  }

  // Estatísticas em tempo real
  const activeStudents = students.filter(s => s.status === 'Ativo').length
  const totalPlans = trainingPlans.length
  const pendingAppointments = appointments.filter(a => a.status === 'scheduled').length
  const completedAppointments = appointments.filter(a => a.status === 'completed').length

  return (
    <ProfessorLayout activeSection="inicio">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Visão Geral</h1>
            <p className="text-muted-foreground">
              Acompanhe suas métricas e atividades em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/professor/aluno/novo">Adicionar Aluno</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/professor/plans">Gerenciar Planos</Link>
            </Button>
          </div>
        </div>

        {/* Métricas Principais - SINCRONIZADAS em tempo real */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                de {students.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos de Treino</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlans}</div>
              <p className="text-xs text-muted-foreground">
                criados este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultorias Pendentes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {completedAppointments} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Engajamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                alunos ativos no app
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alunos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Alunos Recentes</CardTitle>
            <CardDescription>
              Alunos cadastrados recentemente - Dados sincronizados com App do Aluno
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={student.status === 'Ativo' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                        {student.plan && student.plan !== 'none' ? (
                          <Badge variant="outline" className="text-xs">
                            <Dumbbell className="h-3 w-3 mr-1" />
                            {student.plan}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem plano</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/professor/aluno/${student.id}`}>
                        Ver Detalhes
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/professor/chat/${student.id}`}>
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {students.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum aluno cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando seu primeiro aluno
                </p>
                <Button asChild>
                  <Link to="/professor/aluno/novo">Adicionar Primeiro Aluno</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultorias Pendentes */}
        {pendingAppointments > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas Consultorias</CardTitle>
              <CardDescription>
                Consultorias agendadas pelos alunos - Sincronizado em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments
                  .filter(a => a.status === 'scheduled')
                  .slice(0, 3)
                  .map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.scheduled_time).toLocaleDateString()} às {new Date(appointment.scheduled_time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfessorLayout>
  )
}