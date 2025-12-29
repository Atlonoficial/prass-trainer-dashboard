import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEvaluations } from '@/hooks/useEvaluations'
import { ClipboardCheck, TrendingUp, Users, Calendar, Eye, Activity, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { translateEvaluationField, formatEvaluationValue } from '@/lib/evaluationFieldsMapping'
import { FeedbacksOverview } from './FeedbacksOverview'

interface EvaluationsOverviewProps {
  type?: 'evaluations' | 'feedbacks'
}

export function EvaluationsOverview({ type = 'evaluations' }: EvaluationsOverviewProps) {
  // If type is feedbacks, render FeedbacksOverview instead
  if (type === 'feedbacks') {
    return <FeedbacksOverview />
  }
  
  const { evaluations, loading, getEvaluationStats } = useEvaluations()

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              Carregando avaliações...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getEvaluationStats()

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { 
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return 'Data inválida'
    }
  }

  // Get unique students
  const uniqueStudents = new Set(evaluations.map(e => e.user_id))

  // Group recent evaluations by student
  const recentByStudent = evaluations
    .slice(0, 20)
    .reduce((acc, evaluation) => {
      const studentName = evaluation.student_name
      if (!acc[studentName]) {
        acc[studentName] = []
      }
      acc[studentName].push(evaluation)
      return acc
    }, {} as Record<string, typeof evaluations>)

  return (
    <div className="p-6">
      <Tabs defaultValue="evaluations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evaluations" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedbacks
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="evaluations" className="mt-6">
          {evaluations.length === 0 ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Avaliações dos Alunos
                </CardTitle>
                <CardDescription>
                  Acompanhe as avaliações enviadas pelos seus alunos em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma avaliação ainda</h3>
                  <p className="text-muted-foreground">
                    Quando seus alunos registrarem avaliações no app, elas aparecerão aqui automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Avaliações</p>
                        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      </div>
                      <ClipboardCheck className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                        <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-success" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Este Mês</p>
                        <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-info" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Alunos Ativos</p>
                        <p className="text-2xl font-bold text-foreground">{uniqueStudents.size}</p>
                      </div>
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Evaluations */}
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Avaliações Recentes
                    </CardTitle>
                    <CardDescription>
                      Últimas avaliações enviadas pelos alunos
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Todas
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recentByStudent).map(([studentName, studentEvaluations]) => (
                      <div key={studentName} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{studentName}</span>
                          </div>
                          <Badge variant="outline">
                            {studentEvaluations.length} avaliação{studentEvaluations.length !== 1 ? 'ões' : ''}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {studentEvaluations.slice(0, 6).map(evaluation => (
                            <div 
                              key={evaluation.id}
                              className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                            >
                              <div>
                                <span className="font-medium text-foreground">
                                  {translateEvaluationField(evaluation.type).label}: {formatEvaluationValue(evaluation.type, evaluation.value)}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {formatRelativeTime(evaluation.date)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {studentEvaluations.length > 6 && (
                          <div className="mt-2 text-center">
                            <Button variant="ghost" size="sm">
                              Ver mais {studentEvaluations.length - 6} avaliações
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {Object.keys(recentByStudent).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma avaliação recente
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="feedbacks" className="mt-6">
          <FeedbacksOverview />
        </TabsContent>
      </Tabs>
    </div>
  )
}