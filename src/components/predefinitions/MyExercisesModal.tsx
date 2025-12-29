import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, Search, Plus, MoreHorizontal, Youtube, Edit, Trash2, Upload, Video, Grid, Eye, Dumbbell, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import AddExerciseModal from './AddExerciseModal';
import { BulkImportModal } from './BulkImportModal';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { useExercises } from '@/hooks/useExercises';
import { Skeleton } from '@/components/ui/skeleton';
import ExerciseVideoPreviewModal from './ExerciseVideoPreviewModal';

interface MyExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyExercisesModal({ isOpen, onClose }: MyExercisesModalProps) {
  const { toast } = useToast();
  const { exercises, loading, addExercise, updateExercise, deleteExercise } = useExercises();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; exerciseId: string | null }>({
    isOpen: false,
    exerciseId: null
  });

  const [videoPreview, setVideoPreview] = useState<{
    isOpen: boolean;
    videoUrl: string | null;
    exerciseName: string;
  }>({
    isOpen: false,
    videoUrl: null,
    exerciseName: ''
  });

  const filteredExercises = exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug logs
  console.log(`📊 Total exercises: ${exercises.length}`);
  console.log(`🔍 Filtered exercises: ${filteredExercises.length}`);
  console.log(`🎥 Exercises with video: ${exercises.filter(e => e.video_url).length}`);

  const handleVideoPreview = (videoUrl: string, exerciseName: string) => {
    setVideoPreview({
      isOpen: true,
      videoUrl,
      exerciseName
    });
  };

  const handleSaveExercise = async (exerciseData: any) => {
    try {
      console.log('💪 Saving exercise from modal:', exerciseData);
      if (editingExercise) {
        await updateExercise(editingExercise.id, exerciseData);
        setEditingExercise(null);
      } else {
        await addExercise(exerciseData);
      }
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving exercise:', error);
    }
  };

  const handleEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    setIsAddModalOpen(true);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setDeleteDialog({ isOpen: true, exerciseId });
  };

  const confirmDelete = async () => {
    if (deleteDialog.exerciseId) {
      try {
        await deleteExercise(deleteDialog.exerciseId);
        setDeleteDialog({ isOpen: false, exerciseId: null });
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-[98vw] h-[92vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 pr-16 border-b border-border/40">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Meus Exercícios
                  <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                    {exercises.length}
                  </Badge>
                  {exercises.filter(e => e.video_url).length > 0 && (
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      <Video className="w-3 h-3 mr-1" />
                      {exercises.filter(e => e.video_url).length}
                    </Badge>
                  )}
                </DialogTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLibraryModal(true)}
                  className="gap-2 h-9 px-3"
                >
                  <Grid className="w-4 h-4" />
                  Biblioteca
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkImportModal(true)}
                  className="gap-2 h-9 px-3"
                >
                  <Upload className="w-4 h-4" />
                  Importar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-2 h-9 px-3"
                >
                  <Plus className="w-4 h-4" />
                  Novo
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-shrink-0 px-4 py-2 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercícios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-52" />
                ))}
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="text-base font-medium">Nenhum exercício encontrado</p>
                <p className="text-sm text-center max-w-sm mt-1">
                  {searchTerm 
                    ? 'Tente buscar por outro termo'
                    : 'Adicione seu primeiro exercício personalizado'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredExercises.map((exercise) => (
                  <Card 
                    key={exercise.id} 
                    className={cn(
                      "group relative overflow-hidden",
                      "border border-border/40 bg-card/50 backdrop-blur-sm",
                      "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                      "transition-all duration-300 ease-out",
                      "p-4"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-1 mb-2">
                          {exercise.name}
                        </h3>
                        
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border/50">
                            {exercise.category}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-2 py-0.5 h-5 border-border/50",
                              exercise.difficulty === 'Avançado' && "border-orange-500/30 text-orange-600 dark:text-orange-400",
                              exercise.difficulty === 'Intermediário' && "border-blue-500/30 text-blue-600 dark:text-blue-400",
                              exercise.difficulty === 'Iniciante' && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {exercise.difficulty}
                          </Badge>
                          {exercise.video_url && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            >
                              <Video className="w-2.5 h-2.5 mr-1" />
                              Vídeo
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {exercise.video_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoPreview(exercise.video_url!, exercise.name);
                            }}
                            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                            title="Visualizar vídeo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditExercise(exercise)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {exercise.video_url && (
                              <DropdownMenuItem onClick={() => window.open(exercise.video_url!, '_blank')}>
                                <Youtube className="w-4 h-4 mr-2" />
                                Abrir Vídeo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteExercise(exercise.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {exercise.description && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                        {exercise.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{exercise.sets}×{exercise.reps}</span>
                        <span className="text-[10px]">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{exercise.rest_time}s</span>
                        </div>
                      </div>
                    </div>

                    {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                      <div className="pt-3 border-t border-border/40">
                        <div className="flex flex-wrap gap-1.5">
                          {exercise.muscle_groups.slice(0, 3).map((muscle, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 h-5 font-normal border-border/50"
                            >
                              {muscle}
                            </Badge>
                          ))}
                          {exercise.muscle_groups.length > 3 && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-2 py-0.5 h-5 font-normal border-border/50"
                            >
                              +{exercise.muscle_groups.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar/Editar Exercício */}
      <AddExerciseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExercise(null);
        }}
        onSave={handleSaveExercise}
        exercise={editingExercise}
      />

      {/* Modal de Importação em Massa */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
      />

      {/* Modal da Biblioteca de Exercícios */}
      <ExerciseLibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onSelectExercise={(exercise) => {
          setEditingExercise(exercise);
          setIsAddModalOpen(true);
          setShowLibraryModal(false);
        }}
      />

      {/* Modal de Preview de Vídeo */}
      <ExerciseVideoPreviewModal
        isOpen={videoPreview.isOpen}
        onClose={() => setVideoPreview({ isOpen: false, videoUrl: null, exerciseName: '' })}
        videoUrl={videoPreview.videoUrl || ''}
        exerciseName={videoPreview.exerciseName}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, exerciseId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
