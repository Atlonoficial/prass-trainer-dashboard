import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Activity, Utensils, FileText } from 'lucide-react';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useMealPlans } from '@/hooks/useMealPlans';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
}

interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused';
  workouts: number;
  exercises: number;
}

export default function StudentProfileModal({ isOpen, onClose, studentName, studentId }: StudentProfileModalProps) {
  const { workoutPlans, loading } = useWorkoutPlans();
  const { mealPlans, loading: mealPlansLoading } = useMealPlans({ studentId });
  
  // Get student's workout plans
  const studentWorkoutPlans = useMemo(() => {
    return workoutPlans.filter(plan => 
      plan.assigned_students?.includes(studentId)
    ).map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || 'Plano de treino personalizado',
      startDate: plan.created_at.split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: plan.status === 'active' ? 'active' as const : 'completed' as const,
      workouts: Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0,
      exercises: Array.isArray(plan.exercises_data) ? 
        plan.exercises_data.reduce((total, workout) => total + (workout.exercises?.length || 0), 0) : 0
    }));
  }, [workoutPlans, studentId]);

  // Get student's meal plans
  const studentMealPlans = useMemo(() => {
    return mealPlans
      .filter(plan => plan.assigned_students?.includes(studentId))
      .map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || 'Plano nutricional personalizado',
        startDate: plan.created_at.split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: plan.status === 'active' ? 'active' as const : 
                plan.status === 'archived' ? 'completed' as const : 'paused' as const,
        calories: plan.total_calories || 0,
        meals: Array.isArray(plan.meals_data) ? plan.meals_data.length : 0
      }));
  }, [mealPlans, studentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'completed':
        return 'bg-info text-info-foreground';
      case 'paused':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'completed':
        return 'Concluído';
      case 'paused':
        return 'Pausado';
      default:
        return 'Indefinido';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">{studentName.charAt(0)}</span>
              </div>
              <div>
                <DialogTitle className="text-foreground">Perfil do Aluno</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {studentName} - Histórico de planos
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="training" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="training" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Activity className="w-4 h-4 mr-2" />
              Planos de Treino
            </TabsTrigger>
            <TabsTrigger value="diet" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Utensils className="w-4 h-4 mr-2" />
              Planos de Dieta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Planos de Treino</h3>
              <Badge variant="outline" className="text-muted-foreground border-border">
                {studentWorkoutPlans.length} planos
              </Badge>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <Card className="bg-card border-border p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                </Card>
              ) : studentWorkoutPlans.length === 0 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-foreground font-medium mb-2">Nenhum plano de treino encontrado</h4>
                  <p className="text-muted-foreground text-sm">Crie um novo plano de treino para este aluno.</p>
                </Card>
              ) : (
                studentWorkoutPlans.map((plan) => (
                  <Card key={plan.id} className="bg-card border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-foreground">{plan.name}</h4>
                          <Badge className={getStatusColor(plan.status)}>
                            {getStatusText(plan.status)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{plan.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(plan.startDate).toLocaleDateString('pt-BR')} - {new Date(plan.endDate).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Activity className="w-4 h-4 mr-2" />
                            {plan.workouts} treinos, {plan.exercises} exercícios
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground">
                          <FileText className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        {plan.status === 'active' && (
                          <Button size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground">
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="diet" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Planos de Dieta</h3>
              <Badge variant="outline" className="text-muted-foreground border-border">
                {studentMealPlans.length} planos
              </Badge>
            </div>

            <div className="grid gap-4">
              {mealPlansLoading ? (
                <Card className="bg-card border-border p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                </Card>
              ) : studentMealPlans.length === 0 ? (
                <Card className="bg-card border-border p-8 text-center">
                  <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-foreground font-medium mb-2">Nenhum plano de dieta encontrado</h4>
                  <p className="text-muted-foreground text-sm">Crie um novo plano de dieta para este aluno.</p>
                </Card>
              ) : (
                studentMealPlans.map((plan) => (
                  <Card key={plan.id} className="bg-card border-border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-foreground">{plan.name}</h4>
                          <Badge className={getStatusColor(plan.status)}>
                            {getStatusText(plan.status)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{plan.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(plan.startDate).toLocaleDateString('pt-BR')} - {new Date(plan.endDate).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Utensils className="w-4 h-4 mr-2" />
                            {plan.calories} kcal, {plan.meals} refeições
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground">
                          <FileText className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        {plan.status === 'active' && (
                          <Button size="sm" variant="outline" className="text-muted-foreground border-border hover:bg-muted hover:text-foreground">
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}