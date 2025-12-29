import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, Clock, Calendar, User, Plus, MoreVertical, Target, Zap, Search } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Trash, Play, Pause, Archive, Copy } from 'lucide-react';
import TrainingPlanModal from './TrainingPlanModal';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentTrainingPlansViewProps {
  studentUserId: string;
  studentName: string;
}

export function StudentTrainingPlansView({ studentUserId, studentName }: StudentTrainingPlansViewProps) {
  const { 
    workoutPlans: plans, 
    loading, 
    createWorkoutPlan, 
    updateWorkoutPlan, 
    deleteWorkoutPlan, 
    getWorkoutPlansByStudent 
  } = useWorkoutPlans();
  
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Optimized filtering with useMemo
  const studentPlans = useMemo(() => 
    getWorkoutPlansByStudent(studentUserId), 
    [getWorkoutPlansByStudent, studentUserId]
  );

  // Filter plans based on search and status
  const filteredPlans = useMemo(() => {
    return studentPlans.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plan.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentPlans, searchTerm, statusFilter]);

  // Auto-select first active plan (optimized)
  useEffect(() => {
    if (filteredPlans.length > 0 && !selectedPlan) {
      const activePlan = filteredPlans.find(plan => plan.status === 'active');
      setSelectedPlan(activePlan || filteredPlans[0]);
    }
  }, [filteredPlans, selectedPlan]);

  const getStatusColor = (plan: any) => {
    if (plan.status === 'inactive' || plan.status === 'archived') return 'secondary';
    if (plan.end_date) {
      const daysLeft = differenceInDays(new Date(plan.end_date), new Date());
      if (daysLeft < 0) return 'destructive';
      if (daysLeft <= 3) return 'outline';
    }
    return 'default';
  };

  const getStatusLabel = (plan: any) => {
    if (plan.status === 'inactive') return 'Inativo';
    if (plan.status === 'archived') return 'Arquivado';
    if (plan.end_date) {
      const daysLeft = differenceInDays(new Date(plan.end_date), new Date());
      if (daysLeft < 0) return 'Expirado';
      if (daysLeft === 0) return 'Expira hoje';
      if (daysLeft <= 3) return `${daysLeft} dias restantes`;
    }
    return 'Ativo';
  };

  // Optimized handlers with useCallback
  const handleAddNew = useCallback(() => {
    setEditingPlan(null);
    setShowTrainingModal(true);
  }, []);

  const handleEdit = useCallback((plan: any) => {
    setEditingPlan(plan);
    setShowTrainingModal(true);
  }, []);

  const handleDuplicate = useCallback(async (plan: any) => {
    try {
      const duplicatedPlan = {
        ...plan,
        name: `${plan.name} (Cópia)`,
        assigned_students: [studentUserId]
      };
      await createWorkoutPlan(duplicatedPlan);
    } catch (error) {
      console.error('Error duplicating plan:', error);
    }
  }, [createWorkoutPlan, studentUserId]);

  const handleStatusChange = useCallback(async (planId: string, newStatus: string) => {
    try {
      await updateWorkoutPlan(planId, { status: newStatus as "active" | "inactive" | "completed" });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [updateWorkoutPlan]);

  const handleDelete = useCallback(async (planId: string) => {
    try {
      await deleteWorkoutPlan(planId);
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  }, [deleteWorkoutPlan, selectedPlan]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Compact Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Planos de Treino</h2>
          <p className="text-muted-foreground">
            {studentPlans.length} plano(s) total, {studentPlans.filter(p => p.status === 'active').length} ativo(s)
          </p>
        </div>
        <Button onClick={handleAddNew} className="h-9 px-3 text-sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Plano
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planos de treino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-2"></div>

      {studentPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Primeiro Plano de Treino</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Crie o primeiro plano personalizado para {studentName} e comece o acompanhamento.
            </p>
            <Button onClick={handleAddNew} className="h-9 px-4">
              <Plus className="h-4 w-4 mr-1" />
              Criar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Optimized Plans Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className="hover:shadow-sm transition-all duration-200 animate-fade-in border-l-4"
                style={{
                  borderLeftColor: plan.status === 'active' ? 'hsl(var(--primary))' : 
                                  plan.status === 'inactive' ? 'hsl(var(--muted))' : 
                                  'hsl(var(--destructive))'
                }}
              >
                <CardHeader className="px-6 pt-6 pb-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg leading-6">{plan.name}</CardTitle>
                        <Badge variant={getStatusColor(plan)} className="text-xs">
                          {getStatusLabel(plan)}
                        </Badge>
                      </div>
                      
                      {plan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedPlan(plan)}
                        className="h-8 px-2"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleEdit(plan)} className="text-xs">
                            <Edit className="h-3 w-3 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleDuplicate(plan)} className="text-xs">
                            <Copy className="h-3 w-3 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {plan.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(plan.id, 'inactive')} className="text-xs">
                              <Pause className="h-3 w-3 mr-2" />
                              Pausar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleStatusChange(plan.id, 'active')} className="text-xs">
                              <Play className="h-3 w-3 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem onClick={() => handleStatusChange(plan.id, 'archived')} className="text-xs">
                            <Archive className="h-3 w-3 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive text-xs">
                                <Trash className="h-3 w-3 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o plano "{plan.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(plan.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="px-8 pt-5 pb-6 border-t border-border/40">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {Array.isArray(plan.exercises_data) ? plan.exercises_data.length : 0}
                      </span>
                      
                      {plan.duration_weeks && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {plan.duration_weeks}sem
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {plan.created_at 
                          ? formatDistanceToNow(new Date(plan.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })
                          : 'Sem data'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Compact Plan Details */}
          {selectedPlan && (
            <Card className="animate-fade-in">
              <CardHeader className="px-8 pt-6 pb-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <CardTitle className="text-lg">{selectedPlan.name}</CardTitle>
                      <Badge variant={getStatusColor(selectedPlan)}>
                        {getStatusLabel(selectedPlan)}
                      </Badge>
                    </div>
                    {selectedPlan.description && (
                      <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedPlan(null)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
          </CardHeader>
          <CardContent className="px-8 pt-5 pb-8">
            <div className="space-y-6">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedPlan.created_at 
                      ? formatDistanceToNow(new Date(selectedPlan.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })
                      : 'Sem data'
                    }
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {Array.isArray(selectedPlan.exercises_data) ? selectedPlan.exercises_data.length : 0} exercícios
                  </span>
                </div>
                
                {Array.isArray(selectedPlan.exercises_data) && selectedPlan.exercises_data.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-5 text-sm">Exercícios</h4>
                    <div className="grid gap-4 max-h-48 overflow-y-auto">
                      {selectedPlan.exercises_data.map((exercise: any, index: number) => (
                        <div key={exercise.id || index} className="flex items-center gap-4 p-4 rounded bg-muted/30">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{exercise.name}</p>
                            {exercise.sets && exercise.reps && (
                              <p className="text-xs text-muted-foreground">
                                {exercise.sets}x{exercise.reps}
                                {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                                  <span className="ml-1">• {exercise.muscle_groups.slice(0, 2).join(', ')}</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Training Plan Modal */}
      {showTrainingModal && (
        <TrainingPlanModal
          isOpen={showTrainingModal}
          onClose={() => {
            setShowTrainingModal(false);
            setEditingPlan(null);
          }}
          studentName={studentName}
          studentId={studentUserId}
          editingPlan={editingPlan}
        />
      )}
    </div>
  );
}