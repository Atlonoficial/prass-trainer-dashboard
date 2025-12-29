import { useParams, Link } from "react-router-dom"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStudents } from "@/hooks/useStudents"
import { useWorkoutPlans } from "@/hooks/useWorkoutPlans"
import { useMealPlans } from "@/hooks/useMealPlans"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { getExpirationDisplay } from '@/lib/studentUtils'
import {
  ArrowLeft,
  Dumbbell, 
  MessageCircle,
  Calendar,
  User,
  Phone,
  Mail,
  Target,
  Clock,
  Edit,
  Apple
} from "lucide-react"

// PÁGINA: Detalhes do Aluno
// CONEXÃO: Mesma coleção 'students' que o App do Aluno acessa
// SINCRONIZAÇÃO: O aluno vê seus dados em tempo real, professor vê dados do aluno
// Hook useMyTrainings no App do Aluno usa where('student_id', '==', user.uid)

export default function StudentDetail() {
  const { id } = useParams()
  const { students, loading: studentsLoading } = useStudents()
  const { workoutPlans: trainingPlans, loading: plansLoading } = useWorkoutPlans()
  const { mealPlans, loading: dietLoading } = useMealPlans()

  if (studentsLoading || plansLoading || dietLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const student = students.find(s => s.id === id)
  
  if (!student) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Aluno não encontrado</h2>
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

  // Filtra treinos deste aluno específico usando user_id
  const studentTrainingPlans = useMemo(() => 
    trainingPlans.filter(plan => 
      Array.isArray(plan.assigned_students) && 
      plan.assigned_students.includes(student.user_id)
    ),
    [trainingPlans, student.user_id]
  )

  // Filtra dietas deste aluno específico usando user_id
  const studentDietPlans = useMemo(() => 
    mealPlans.filter(plan => 
      Array.isArray(plan.assigned_students) && 
      plan.assigned_students.includes(student.user_id)
    ),
    [mealPlans, student.user_id]
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/professor/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={student.avatar} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">Detalhes do Aluno</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/professor/chat/${student.id}`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Link>
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="training">Treinos ({studentTrainingPlans.length})</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="diet">Dieta ({studentDietPlans.length})</TabsTrigger>
        </TabsList>

        {/* Informações Pessoais */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Informações básicas - Sincronizadas com perfil do App do Aluno
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{student.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{student.goal}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Cadastrado em {new Date(student.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status da Conta */}
            <Card>
              <CardHeader>
                <CardTitle>Status da Conta</CardTitle>
                <CardDescription>
                  Status atual do aluno no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                    {student.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Plano:</span>
                  <Badge variant="outline">{student.plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Modalidade:</span>
                  <Badge variant="outline">{student.mode}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vencimento:</span>
                  <span className="text-sm text-muted-foreground">
                    {getExpirationDisplay(student)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Treinos */}
        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Planos de Treino</h3>
              <p className="text-muted-foreground">
                Todos os treinos criados para {student.name} - O aluno vê estes mesmos dados no App
              </p>
            </div>
            <Button>
              <Dumbbell className="h-4 w-4 mr-2" />
              Novo Treino
            </Button>
          </div>

          {studentTrainingPlans.length > 0 ? (
            <div className="grid gap-4">
              {studentTrainingPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0} exercícios
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Criado em {new Date(plan.created_at).toLocaleDateString()}</span>
                        <span>Atualizado em {new Date(plan.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Visualizar</Button>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum treino criado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie o primeiro plano de treino para {student.name}
                </p>
                <Button>
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Criar Primeiro Treino
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progresso */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Progresso do Aluno</CardTitle>
              <CardDescription>
                Dados de progresso e evolução - Compartilhados com App do Aluno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Funcionalidade em desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Em breve você poderá acompanhar o progresso detalhado do aluno
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dieta */}
        <TabsContent value="diet" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Planos Alimentares</h3>
              <p className="text-muted-foreground">
                Todas as dietas criadas para {student.name} - O aluno vê estes mesmos dados no App
              </p>
            </div>
            <Button>
              <Apple className="h-4 w-4 mr-2" />
              Nova Dieta
            </Button>
          </div>

          {studentDietPlans.length > 0 ? (
            <div className="grid gap-4">
              {studentDietPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        {plan.description && (
                          <CardDescription>{plan.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                        {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Informações nutricionais */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {plan.total_calories || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Calorias</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {plan.total_protein || 0}g
                          </div>
                          <div className="text-xs text-muted-foreground">Proteínas</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {plan.total_carbs || 0}g
                          </div>
                          <div className="text-xs text-muted-foreground">Carboidratos</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">
                            {plan.total_fat || 0}g
                          </div>
                          <div className="text-xs text-muted-foreground">Gorduras</div>
                        </div>
                      </div>

                      {/* Número de refeições */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {Array.isArray(plan.meals_data) ? plan.meals_data.length : 0} refeições
                          </span>
                          <span>Criado em {new Date(plan.created_at).toLocaleDateString()}</span>
                          <span>Atualizado em {new Date(plan.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Visualizar</Button>
                          <Button variant="outline" size="sm">Editar</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Apple className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma dieta criada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie o primeiro plano alimentar para {student.name}
                </p>
                <Button>
                  <Apple className="h-4 w-4 mr-2" />
                  Criar Primeira Dieta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}