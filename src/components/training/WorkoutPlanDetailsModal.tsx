import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { WorkoutPlan } from '@/services/workoutPlansService'
import { Calendar, Clock, Dumbbell, Users, Target, Tag } from 'lucide-react'

interface WorkoutPlanDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  plan: WorkoutPlan | null
}

export function WorkoutPlanDetailsModal({ isOpen, onClose, plan }: WorkoutPlanDetailsModalProps) {
  if (!plan) return null

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'inactive': return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{plan.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getDifficultyColor(plan.difficulty)}>
              {plan.difficulty === 'beginner' && 'Iniciante'}
              {plan.difficulty === 'intermediate' && 'Intermediário'}
              {plan.difficulty === 'advanced' && 'Avançado'}
            </Badge>
            <Badge variant="outline" className={getStatusColor(plan.status)}>
              {plan.status === 'active' && 'Ativo'}
              {plan.status === 'inactive' && 'Inativo'}
              {plan.status === 'completed' && 'Concluído'}
            </Badge>
            {plan.is_template && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                Template
              </Badge>
            )}
          </div>

          {/* Description */}
          {plan.description && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Descrição
              </h3>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>
          )}

          {/* Plan Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{plan.duration_weeks}</div>
                <div className="text-sm text-muted-foreground">Semanas</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Dumbbell className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{plan.sessions_per_week}</div>
                <div className="text-sm text-muted-foreground">Sessões/semana</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{plan.assigned_students?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Alunos</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{plan.exercises_data?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Exercícios</div>
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          {plan.tags && plan.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {plan.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Exercises */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center">
              <Dumbbell className="w-4 h-4 mr-2" />
              Exercícios ({plan.exercises_data?.length || 0})
            </h3>
            
            {plan.exercises_data && plan.exercises_data.length > 0 ? (
              <div className="space-y-4">
                {plan.exercises_data.map((exercise, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {index + 1}. {exercise.name || 'Exercício sem nome'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-muted-foreground">Séries</div>
                          <div className="text-lg font-semibold">{exercise.sets}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Repetições</div>
                          <div className="text-lg font-semibold">{exercise.reps}</div>
                        </div>
                        {exercise.weight && exercise.weight > 0 && (
                          <div>
                            <div className="font-medium text-muted-foreground">Peso</div>
                            <div className="text-lg font-semibold">{exercise.weight}kg</div>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-muted-foreground">Descanso</div>
                          <div className="text-lg font-semibold">{formatTime(exercise.rest_time)}</div>
                        </div>
                      </div>
                      
                      {exercise.notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <div className="font-medium text-sm text-muted-foreground mb-1">Observações:</div>
                          <div className="text-sm">{exercise.notes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum exercício adicionado a este plano</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {plan.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Observações Gerais</h3>
                <div className="p-4 bg-muted/50 rounded-md">
                  <p className="text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Created Date */}
          {plan.created_at && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Criado em: {new Date(plan.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}