import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/useAuth'
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans'
import { useExerciseVideoMapping } from '@/hooks/useExerciseVideoMapping'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import WeeklyScheduleView from './WeeklyScheduleView'
import { 
  Dumbbell, 
  Clock, 
  Calendar,
  Play,
  CheckCircle2,
  AlertCircle,
  Bot,
  Sparkles
} from 'lucide-react'

interface ExerciseItemProps {
  exercise: any
  onComplete: () => void
}

function ExerciseItem({ exercise, onComplete }: ExerciseItemProps) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{exercise.name}</h4>
            {exercise.sets && exercise.reps && (
              <p className="text-sm text-muted-foreground mt-1">
                {exercise.sets} séries x {exercise.reps} repetições
              </p>
            )}
            {exercise.rest_time && (
              <p className="text-sm text-muted-foreground">
                Descanso: {exercise.rest_time}
              </p>
            )}
            {exercise.notes && (
              <p className="text-sm text-muted-foreground mt-2">
                {exercise.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {exercise.video_url && (
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-1" />
                Vídeo
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onComplete}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Feito
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface WorkoutViewProps {
  workout: any
}

function WorkoutView({ workout }: WorkoutViewProps) {
  const [completedExercises, setCompletedExercises] = useState<string[]>([])
  
  const handleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    )
  }

  const progress = workout.exercises_data?.length > 0 
    ? (completedExercises.length / workout.exercises_data.length) * 100 
    : 0

  return (
    <div className="space-y-4">
      {/* Workout Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {workout.name || 'Treino'}
              </CardTitle>
              {workout.description && (
                <p className="text-muted-foreground mt-1">{workout.description}</p>
              )}
            </div>
            <Badge variant={progress === 100 ? 'default' : 'secondary'}>
              {Math.round(progress)}% completo
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2 mt-3">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Exercises List */}
      <div className="space-y-3">
        {workout.exercises_data?.map((exercise: any, index: number) => (
          <ExerciseItem
            key={exercise.id || index}
            exercise={exercise}
            onComplete={() => handleExerciseComplete(exercise.id || index)}
          />
        ))}
      </div>

      {workout.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{workout.observations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function StudentTrainingView() {
  const { user } = useAuth()
  const { workoutPlans: trainingPlans, loading } = useWorkoutPlans()
  const { enrichWorkoutWithVideos } = useExerciseVideoMapping()
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)

  useEffect(() => {
    if (trainingPlans.length > 0 && !selectedPlan) {
      // Auto-select the most recent active plan
      const activePlans = trainingPlans.filter(plan => 
        (plan as any).tags?.includes('active') || !(plan as any).tags?.includes('inactive')
      )
      if (activePlans.length > 0) {
        setSelectedPlan(activePlans[0])
      }
    }
  }, [trainingPlans, selectedPlan])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (trainingPlans.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum treino disponível</h3>
          <p className="text-muted-foreground">
            Seu professor ainda não criou treinos para você. Entre em contato para receber seu plano personalizado.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentPlan = selectedPlan || trainingPlans[0]
  const workouts = currentPlan?.exercises_data?.filter((ex: any) => ex.type === 'workout') || []
  const isAIGenerated = currentPlan?.tags?.includes('ai-generated')

  if (selectedWorkout) {
    const enrichedWorkout = enrichWorkoutWithVideos(selectedWorkout)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setSelectedWorkout(null)}
          >
            ← Voltar ao Plano
          </Button>
          <div className="flex items-center gap-2">
            {isAIGenerated && (
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 border-purple-200">
                <Bot className="h-3 w-3 mr-1" />
                IA
              </Badge>
            )}
            <Badge variant="outline">
              {selectedWorkout.name}
            </Badge>
          </div>
        </div>
        <WorkoutView workout={enrichedWorkout} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      {trainingPlans.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Meus Planos de Treino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trainingPlans.map((plan) => (
                <Button
                  key={plan.id}
                  variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
                  className="justify-start h-auto p-3"
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="text-left">
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-xs opacity-70">
                      {Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0} treinos
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {currentPlan.name}
                {isAIGenerated && (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 border-purple-200">
                      <Bot className="h-3 w-3 mr-1" />
                      Gerado por IA
                    </Badge>
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                )}
              </CardTitle>
              {currentPlan.description && (
                <p className="text-muted-foreground mt-1">{currentPlan.description}</p>
              )}
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-1">
                {workouts.length} treinos
              </Badge>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Atualizado: {new Date(currentPlan.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Cronograma Semanal</TabsTrigger>
          <TabsTrigger value="workouts">Lista de Treinos</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <WeeklyScheduleView workouts={workouts} />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4">
          {workouts.map((workout: any, index: number) => {
            const enrichedWorkout = enrichWorkoutWithVideos(workout);
            return (
              <Card key={workout.id || index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader onClick={() => setSelectedWorkout(enrichedWorkout)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        Treino {index + 1}: {workout.name}
                        {isAIGenerated && (
                          <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 border-purple-200">
                            <Bot className="h-3 w-3 mr-1" />
                            IA
                          </Badge>
                        )}
                      </CardTitle>
                      {workout.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {workout.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">
                        {workout.exercises_data?.length || 0} exercícios
                      </Badge>
                      {workout.days?.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Dias: {workout.days.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button className="w-full" onClick={() => setSelectedWorkout(enrichedWorkout)}>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Treino
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Aerobic Exercise */}
          {currentPlan.exercises_data?.find((ex: any) => ex.type === 'aerobic') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Exercício Aeróbico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.exercises_data.find((ex: any) => ex.type === 'aerobic').description}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}