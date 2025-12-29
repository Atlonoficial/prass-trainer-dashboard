// NUTRITION SYSTEM 2.0 - Gerenciador Principal
// Interface completa para gestão de planos alimentares

import React, { useState, useMemo } from 'react';
import { useMealPlans } from '@/hooks/useMealPlans';
import { MealPlanModal } from './MealPlanModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Plus, Search, MoreVertical, Edit, Copy, Trash2, Users, Calendar, Utensils, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MealPlansManagerProps {
  studentUserId?: string;
  studentName?: string;
  isStudentView?: boolean;
}

export const MealPlansManager: React.FC<MealPlansManagerProps> = ({
  studentUserId,
  studentName,
  isStudentView = false
}) => {
  const { 
    mealPlans, 
    loading, 
    error, 
    createMealPlan, 
    updateMealPlan, 
    deleteMealPlan, 
    duplicateMealPlan,
    totalPlans,
    activePlans
  } = useMealPlans({ studentId: isStudentView ? studentUserId : undefined });

  // Estados locais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, planId: '', planName: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Filtros de planos
  const filteredPlans = useMemo(() => {
    return mealPlans.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [mealPlans, searchTerm, statusFilter]);

  // Handlers
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleDuplicatePlan = async (plan: any) => {
    try {
      await duplicateMealPlan(plan.id, `${plan.name} (Cópia)`);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const confirmDelete = (planId: string, planName: string) => {
    setDeleteDialog({ open: true, planId, planName });
  };

  const handleDelete = async () => {
    try {
      await deleteMealPlan(deleteDialog.planId);
      setDeleteDialog({ open: false, planId: '', planName: '' });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default', label: 'Ativo' },
      paused: { variant: 'secondary', label: 'Pausado' },
      completed: { variant: 'outline', label: 'Concluído' }
    } as const;

    const config = variants[status as keyof typeof variants] || { variant: 'outline', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  // Loading state
  if (loading && mealPlans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar planos</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {isStudentView ? 'Meus Planos Alimentares' : 'Planos Alimentares'}
          </h2>
          <p className="text-muted-foreground">
            {isStudentView 
              ? `${activePlans} plano(s) ativo(s)`
              : `${totalPlans} plano(s) total, ${activePlans} ativo(s)`
            }
          </p>
        </div>
        
        {!isStudentView && (
          <Button onClick={handleCreatePlan} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planos..."
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
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de planos */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Nenhum plano encontrado' : 'Nenhum plano alimentar'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : isStudentView
                    ? 'Seu professor ainda não criou planos alimentares'
                    : 'Comece criando seu primeiro plano alimentar'
                }
              </p>
              {!isStudentView && !searchTerm && statusFilter === 'all' && (
                <Button onClick={handleCreatePlan}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Plano
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg leading-6">{plan.name}</CardTitle>
                      {getStatusBadge(plan.status)}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  
                  {!isStudentView && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicatePlan(plan)}>
                            <Copy className="h-3 w-3 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => confirmDelete(plan.id, plan.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="px-8 pt-4 pb-6 border-t border-border/40">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {plan.duration_days || 7} dias
                    </span>
                  </div>

                  {/* Informações nutricionais */}
                  {plan.total_calories && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <p className="font-medium">{Math.round(plan.total_calories)}</p>
                        <p className="text-xs text-muted-foreground">Calorias</p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <p className="font-medium">{Math.round(plan.total_protein || 0)}g</p>
                        <p className="text-xs text-muted-foreground">Proteína</p>
                      </div>
                    </div>
                  )}

                  {/* Estudantes atribuídos */}
                  {!isStudentView && plan.assigned_students && plan.assigned_students.length > 0 && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      {plan.assigned_students.length} estudante(s)
                    </div>
                  )}

                  {/* Data de criação */}
                  <div className="text-xs text-muted-foreground">
                    Criado em {format(new Date(plan.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <MealPlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingPlan={editingPlan}
        studentUserId={studentUserId}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, planId: '', planName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano alimentar</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{deleteDialog.planName}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};