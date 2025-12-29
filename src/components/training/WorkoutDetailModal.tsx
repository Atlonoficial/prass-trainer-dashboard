import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import ExerciseModal from './ExerciseModal';

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  onSave: (workout: any) => void;
  planId?: string;
}

export default function WorkoutDetailModal({ 
  isOpen, 
  onClose, 
  workout, 
  onSave,
  planId
}: WorkoutDetailModalProps) {
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [localWorkout, setLocalWorkout] = useState(workout);
  const { updateWorkoutPlan } = useWorkoutPlans();

  const handleAddExercise = (exerciseData: any) => {
    if (exerciseData.exercises && exerciseData.exercises.length > 0) {
      exerciseData.exercises.forEach((exercise: any) => {
        const newExercise = {
          id: `${Date.now()}-${Math.random()}`,
          name: exercise.name,
          category: exercise.category,
          sets: exerciseData.series || '3',
          reps: '12',
          weight: '',
          duration: '',
          rest_time: exerciseData.restInterval || '60',
          notes: exerciseData.observations || ''
        };
        
        setLocalWorkout((prev: any) => ({
          ...prev,
          exercises: [...(prev.exercises || []), newExercise]
        }));
      });
      
      toast.success(`${exerciseData.exercises.length} exercício${exerciseData.exercises.length > 1 ? 's' : ''} adicionado${exerciseData.exercises.length > 1 ? 's' : ''} ao treino.`);
    }
    setShowExerciseModal(false);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setLocalWorkout((prev: any) => ({
      ...prev,
      exercises: prev.exercises.filter((e: any) => e.id !== exerciseId)
    }));
    toast.success("Exercício removido do treino.");
  };

  const handleUpdateObservations = (observations: string) => {
    setLocalWorkout((prev: any) => ({
      ...prev,
      observations
    }));
  };

  const handleSave = () => {
    onSave(localWorkout);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{localWorkout.name?.[0] || 'T'}</span>
                </div>
                <div>
                  <DialogTitle className="text-foreground">{localWorkout.name}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Gerenciar exercícios do treino
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex space-x-3">
              <Button 
                onClick={() => setShowExerciseModal(true)}
                className="btn-branded"
              >
                Adicionar exercício
              </Button>
              <Button variant="outline">
                Criar novo exercício
              </Button>
            </div>

            {(!localWorkout.exercises || localWorkout.exercises.length === 0) ? (
              <div className="text-center py-12">
                <Dumbbell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum exercício adicionado</h3>
                <p className="text-muted-foreground mb-4">Clique em "Adicionar exercício" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Exercícios do Treino ({localWorkout.exercises.length})</h3>
                <div className="space-y-3">
                  {localWorkout.exercises.map((exercise: any, index: number) => (
                    <div key={exercise.id || `exercise-${index}`} className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {exercise.sets}x{exercise.reps} {exercise.weight && `- ${exercise.weight}kg`}
                          </p>
                          {exercise.rest_time && (
                            <p className="text-sm text-muted-foreground">Descanso: {exercise.rest_time}s</p>
                          )}
                          {exercise.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{exercise.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRemoveExercise(exercise.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-foreground font-medium">Observações do Treino</Label>
              <Textarea
                value={localWorkout.observations || ''}
                onChange={(e) => handleUpdateObservations(e.target.value)}
                placeholder="Adicione observações sobre este treino..."
                className="mt-2 bg-background border-input text-foreground"
                rows={4}
              />
              <div className="flex justify-between mt-1">
                <span className="text-sm text-muted-foreground"></span>
                <span className="text-sm text-muted-foreground">{(localWorkout.observations || '').length}/1000</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onClose}>
                Voltar
              </Button>
              <Button 
                onClick={handleSave}
                className="btn-branded"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSave={handleAddExercise}
      />
    </>
  );
}