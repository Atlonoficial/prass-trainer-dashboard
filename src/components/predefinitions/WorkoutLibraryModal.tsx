import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, Plus, Search, Dumbbell, Clock, Zap, Edit, Trash2, Play, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkoutLibrary } from '@/hooks/useWorkoutLibrary';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import CreateWorkoutTemplateModal from './CreateWorkoutTemplateModal';

interface WorkoutLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate?: (template: any) => void;
}

export default function WorkoutLibraryModal({ isOpen, onClose, onUseTemplate }: WorkoutLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<any>(null);
  
  const {
    workouts,
    loading,
    error,
    createWorkoutTemplate,
    deleteWorkoutTemplate,
    searchWorkouts,
    getWorkoutsByCategory,
    getCategories,
    refetch
  } = useWorkoutLibrary();

  // Filtrar treinos baseado nos critérios
  const getFilteredWorkouts = () => {
    let filtered = workouts;
    
    if (searchTerm) {
      filtered = searchWorkouts(searchTerm);
    }
    if (selectedCategory) {
      filtered = filtered.filter(w => w.template_category === selectedCategory);
    }
    if (selectedDifficulty) {
      filtered = filtered.filter(w => w.difficulty === selectedDifficulty);
    }
    
    return filtered;
  };

  const filteredWorkouts = getFilteredWorkouts();
  const categories = getCategories();

  const handleUseWorkout = (workout: any) => {
    if (onUseTemplate) {
      onUseTemplate(workout);
      toast.success(`Template "${workout.name}" selecionado!`);
      onClose();
    }
  };

  const handleEditWorkout = (workout: any) => {
    setEditingTemplate(workout);
    setShowCreateModal(true);
  };

  const handleDeleteClick = (workout: any) => {
    setWorkoutToDelete(workout);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (workoutToDelete) {
      try {
        await deleteWorkoutTemplate(workoutToDelete.id);
        toast.success('Template excluído com sucesso!');
        setShowDeleteDialog(false);
        setWorkoutToDelete(null);
      } catch (error) {
        toast.error('Erro ao excluir template');
      }
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-center space-y-0 px-5 pt-5 pb-3 pr-12 border-b border-border/40">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="mr-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <DialogTitle>Biblioteca de Treinos</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col space-y-4 flex-1 px-6 py-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar treinos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-32"
                >
                  <option value="">Categoria</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              )}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-32"
              >
                <option value="">Dificuldade</option>
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-48" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-destructive mb-2">Erro ao carregar treinos</p>
                    <Button variant="outline" onClick={refetch}>
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : filteredWorkouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Nenhum treino encontrado</p>
                  <p className="text-sm">Crie seu primeiro template de treino</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorkouts.map((workout) => (
                    <Card 
                      key={workout.id} 
                      className={cn(
                        "group relative overflow-hidden",
                        "border border-border/40 bg-card/50 backdrop-blur-sm",
                        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                        "transition-all duration-300 ease-out",
                        "p-4"
                      )}
                    >
                      {/* Header: Título + Badges + Menu */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-1">
                            {workout.name}
                          </h3>
                          
                          {/* Badges discretos */}
                          <div className="flex gap-1.5 flex-wrap">
                            {workout.template_category && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border/50">
                                {workout.template_category}
                              </Badge>
                            )}
                            {workout.difficulty && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] px-2 py-0.5 h-5 border-border/50",
                                  workout.difficulty === 'advanced' && "border-orange-500/30 text-orange-600 dark:text-orange-400",
                                  workout.difficulty === 'intermediate' && "border-blue-500/30 text-blue-600 dark:text-blue-400",
                                  workout.difficulty === 'beginner' && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {workout.difficulty === 'beginner' ? 'Iniciante' : 
                                 workout.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Menu de ações - aparece no hover */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onUseTemplate && (
                              <DropdownMenuItem onClick={() => handleUseWorkout(workout)}>
                                <Play className="w-4 h-4 mr-2" />
                                Usar Template
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEditWorkout(workout)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(workout)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Descrição opcional */}
                      {workout.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">
                          {workout.description}
                        </p>
                      )}
                      
                      {/* Grid de estatísticas clean com ícones circulares */}
                      <div className="flex items-center gap-4 mb-3">
                        {/* Duração */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground leading-none">
                              {workout.estimated_duration || 'N/A'}min
                            </span>
                            <span className="text-[10px] text-muted-foreground">Duração</span>
                          </div>
                        </div>
                        
                        {/* Calorias */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground leading-none">
                              {workout.estimated_calories || 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground">kcal</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Grupos musculares minimalistas */}
                      {workout.muscle_groups && workout.muscle_groups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {workout.muscle_groups.slice(0, 3).map((group, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 h-5 font-normal border-border/50 bg-transparent"
                            >
                              {group}
                            </Badge>
                          ))}
                          {workout.muscle_groups.length > 3 && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 h-5 font-normal border-border/50 bg-transparent"
                            >
                              +{workout.muscle_groups.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Footer com ações minimalistas */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        {/* Info adicional */}
                        <div className="text-xs text-muted-foreground/60">
                          {workout.exercises?.length || 0} exercícios
                        </div>
                        
                        {/* Ações no canto direito */}
                        <div className="flex items-center gap-1">
                          {onUseTemplate && (
                            <Button 
                              onClick={() => handleUseWorkout(workout)}
                              variant="ghost" 
                              size="sm"
                              className="h-8 px-3 text-xs hover:bg-primary/10 hover:text-primary"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Usar
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleEditWorkout(workout)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteClick(workout)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateWorkoutTemplateModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        editingTemplate={editingTemplate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{workoutToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}