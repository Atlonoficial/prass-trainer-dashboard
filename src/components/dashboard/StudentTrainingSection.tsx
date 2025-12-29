import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Dumbbell, 
  Clock, 
  Calendar, 
  Play, 
  CheckCircle, 
  Target,
  Filter,
  Search,
  TrendingUp,
  Award,
  Flame
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';

export function StudentTrainingSection() {
  const { user } = useAuth();
  const { 
    workoutPlans: allPlans, 
    loading, 
    getWorkoutPlansByStudent,
    refetch: fetchPlans 
  } = useWorkoutPlans();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'inactive'>('all');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Get user's assigned plans
  const userPlans = user?.id ? getWorkoutPlansByStudent(user.id) : [];

  // Filter and search plans
  const filteredPlans = userPlans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Auto-select first active plan
  useEffect(() => {
    if (filteredPlans.length > 0 && !selectedPlan) {
      const activePlan = filteredPlans.find(plan => plan.status === 'active');
      setSelectedPlan(activePlan || filteredPlans[0]);
    }
  }, [filteredPlans, selectedPlan]);

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'inactive': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'inactive': return <Clock className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (plan: any) => {
    if (plan.status === 'inactive') return 'Pausado';
    if (plan.status === 'completed') return 'Concluído';
    if (plan.status === 'active') return 'Ativo';
    return 'Pendente';
  };

  const startWorkout = (plan: any) => {
    toast.success(`Iniciando treino: ${plan.name}`);
    // Here you would implement the workout start logic
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const activePlans = userPlans.filter(p => p.status === 'active').length;
  const completedWorkouts = userPlans.filter(p => p.status === 'completed').length;
  const totalExercises = userPlans.reduce((acc, plan) => 
    acc + (Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0), 0
  );

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Meus Treinos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Acompanhe seu progresso e execute seus treinos</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3 sm:p-3.5 lg:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Planos Ativos</p>
                <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{activePlans}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-primary leading-tight">Em andamento</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-3 sm:p-3.5 lg:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Treinos Concluídos</p>
                <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{completedWorkouts}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Award className="w-3 h-3 text-success flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-success leading-tight">Parabéns!</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/5 to-info/10 border-info/20">
          <CardContent className="p-3 sm:p-3.5 lg:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Total de Exercícios</p>
                <p className="text-lg sm:text-xl lg:text-xl font-bold text-foreground mt-0.5">{totalExercises}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Flame className="w-3 h-3 text-warning flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-warning leading-tight">Variedade</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {userPlans.length === 0 ? (
        <Card className="bg-muted/20 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4 sm:mb-5">
              <Dumbbell className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2 text-foreground">Nenhum plano de treino encontrado</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-5 max-w-md">
              Você ainda não possui planos de treino atribuídos. Entre em contato com seu professor para receber seu primeiro plano!
            </p>
            <div className="bg-info/10 border border-info/20 rounded-lg p-2.5 sm:p-3 max-w-md">
              <p className="text-[10px] sm:text-xs text-info">
                💡 Assim que seu professor criar um plano para você, ele aparecerá automaticamente aqui!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                    <Input
                      placeholder="Buscar treinos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)} className="flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-4 h-9 p-0.5">
                    <TabsTrigger value="all" className="text-[10px] sm:text-xs px-2 py-1">Todos</TabsTrigger>
                    <TabsTrigger value="active" className="text-[10px] sm:text-xs px-2 py-1">Ativos</TabsTrigger>
                    <TabsTrigger value="completed" className="text-[10px] sm:text-xs px-2 py-1">Concluídos</TabsTrigger>
                    <TabsTrigger value="inactive" className="text-[10px] sm:text-xs px-2 py-1">Pausados</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Plans Grid */}
          <div className="grid gap-3 sm:gap-3.5 lg:gap-4">
            {filteredPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`hover:shadow-lg transition-all duration-300 hover-scale cursor-pointer ${
                  selectedPlan?.id === plan.id ? 'ring-2 ring-primary border-primary/50' : ''
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-3 sm:p-3.5 lg:p-4">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex-1 space-y-1 sm:space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground">{plan.name}</h3>
                        <Badge 
                          variant={getStatusVariant(plan.status)} 
                          className="flex items-center gap-1 text-[10px] sm:text-xs px-1.5 py-0.5"
                        >
                          {getStatusIcon(plan.status)}
                          {getStatusLabel(plan)}
                        </Badge>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {plan.description || 'Sem descrição disponível'}
                      </p>
                      
                      <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 flex-shrink-0" />
                          <span>{Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0} ex.</span>
                        </div>
                        
                        {plan.duration_weeks && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{plan.duration_weeks} sem.</span>
                          </div>
                        )}
                        
                        {plan.created_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="hidden sm:inline">
                              Criado {formatDistanceToNow(new Date(plan.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            <span className="sm:hidden">
                              {format(new Date(plan.created_at), 'dd/MM/yy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {plan.status === 'active' && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startWorkout(plan);
                        }}
                        className="gap-1.5 bg-gradient-primary hover:opacity-90 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-shrink-0"
                      >
                        <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Iniciar Treino</span>
                        <span className="sm:hidden">Iniciar</span>
                      </Button>
                    )}
                  </div>

                  {/* Progress Bar for Active Plans */}
                  {plan.status === 'active' && plan.duration_weeks && (
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="flex justify-between text-[10px] sm:text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="text-primary font-medium">65%</span>
                      </div>
                      <Progress value={65} className="h-1.5 sm:h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Plan Details */}
          {selectedPlan && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary" />
                      </div>
                      <span className="truncate">{selectedPlan.name}</span>
                    </CardTitle>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">{selectedPlan.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedPlan(null)}
                    className="h-7 sm:h-8 px-2 sm:px-3 text-xs flex-shrink-0"
                  >
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-primary">
                      {Array.isArray(selectedPlan.exercises_data) ? selectedPlan.exercises_data.length : 0}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Exercícios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-success">{selectedPlan.duration_weeks || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Semanas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-info">{selectedPlan.sessions_per_week || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Por Semana</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-warning">
                      {selectedPlan.difficulty === 'beginner' ? 'Iniciante' : 
                       selectedPlan.difficulty === 'intermediate' ? 'Interm.' : 
                       selectedPlan.difficulty === 'advanced' ? 'Avançado' : 'N/A'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Nível</p>
                  </div>
                </div>
                
                {Array.isArray(selectedPlan.exercises_data) && selectedPlan.exercises_data.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                      <Target className="w-4 h-4 text-primary flex-shrink-0" />
                      Exercícios do Plano
                    </h4>
                    <div className="grid gap-2 sm:gap-2.5">
                      {selectedPlan.exercises_data.slice(0, 6).map((exercise: any, index: number) => (
                        <div key={exercise.id || index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-card border hover:bg-muted/50 transition-colors">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs sm:text-sm truncate">{exercise.name}</p>
                            {exercise.sets && exercise.reps && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {exercise.sets}x{exercise.reps}
                                {exercise.weight && <span className="ml-1">• {exercise.weight}kg</span>}
                              </p>
                            )}
                            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1">
                                {exercise.muscle_groups.slice(0, 3).map((muscle: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0">
                                    {muscle}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {exercise.rest_time && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Desc.</p>
                              <p className="text-xs sm:text-sm font-medium text-info">{exercise.rest_time}s</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedPlan.exercises_data.length > 6 && (
                        <div className="text-center py-2 sm:py-3">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Ver todos os {selectedPlan.exercises_data.length} exercícios
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}