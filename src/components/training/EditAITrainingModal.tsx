import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  rest_time: string;
  muscle_group: string;
  instructions?: string;
  safety_notes?: string;
  modifications?: string;
}

interface EditAITrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSave: (updatedPlan: any) => void;
}

export function EditAITrainingModal({ isOpen, onClose, plan, onSave }: EditAITrainingModalProps) {
  const [editedPlan, setEditedPlan] = useState(plan);
  const [exercises, setExercises] = useState<Exercise[]>(plan?.exercises || []);
  const { toast } = useToast();

  const handleSave = () => {
    const updatedPlan = {
      ...editedPlan,
      exercises: exercises
    };
    
    onSave(updatedPlan);
    toast({
      title: "Sucesso",
      description: "Plano de treino editado com sucesso!",
    });
    onClose();
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const addExercise = () => {
    const newExercise: Exercise = {
      name: 'Novo Exercício',
      sets: 3,
      reps: '10-12',
      rest_time: '60s',
      muscle_group: 'Peito',
      instructions: '',
      safety_notes: '',
      modifications: ''
    };
    setExercises([...exercises, newExercise]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Editar Plano de Treino</span>
            {plan?.generation_context?.useAnamnesis && (
              <Badge variant="secondary">Baseado na Anamnese</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planName">Nome do Plano</Label>
              <Input
                id="planName"
                value={editedPlan?.name || ''}
                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                placeholder="Nome do plano de treino"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duração (semanas)</Label>
              <Input
                id="duration"
                type="number"
                value={editedPlan?.duration_weeks || 4}
                onChange={(e) => setEditedPlan({ ...editedPlan, duration_weeks: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={editedPlan?.description || ''}
              onChange={(e) => setEditedPlan({ ...editedPlan, description: e.target.value })}
              placeholder="Descrição do plano de treino"
              rows={3}
            />
          </div>

          {/* Lista de Exercícios */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Exercícios</h3>
              <Button onClick={addExercise} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Exercício
              </Button>
            </div>

            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2 lg:col-span-1">
                      <Label>Nome do Exercício</Label>
                      <Input
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        placeholder="Nome do exercício"
                      />
                    </div>
                    
                    <div>
                      <Label>Séries</Label>
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label>Repetições</Label>
                      <Input
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        placeholder="Ex: 10-12"
                      />
                    </div>
                    
                    <div>
                      <Label>Peso</Label>
                      <Input
                        value={exercise.weight || ''}
                        onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                        placeholder="Ex: 40kg"
                      />
                    </div>
                    
                    <div>
                      <Label>Descanso</Label>
                      <Input
                        value={exercise.rest_time}
                        onChange={(e) => updateExercise(index, 'rest_time', e.target.value)}
                        placeholder="Ex: 60s"
                      />
                    </div>
                    
                    <div>
                      <Label>Grupo Muscular</Label>
                      <Input
                        value={exercise.muscle_group}
                        onChange={(e) => updateExercise(index, 'muscle_group', e.target.value)}
                        placeholder="Ex: Peito"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Instruções</Label>
                      <Textarea
                        value={exercise.instructions || ''}
                        onChange={(e) => updateExercise(index, 'instructions', e.target.value)}
                        placeholder="Instruções de execução"
                        rows={2}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Observações de Segurança</Label>
                      <Textarea
                        value={exercise.safety_notes || ''}
                        onChange={(e) => updateExercise(index, 'safety_notes', e.target.value)}
                        placeholder="Observações importantes"
                        rows={2}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Modificações/Adaptações</Label>
                      <Textarea
                        value={exercise.modifications || ''}
                        onChange={(e) => updateExercise(index, 'modifications', e.target.value)}
                        placeholder="Adaptações possíveis"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-end justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Observações Médicas */}
          {plan?.generation_context?.useAnamnesis && (
            <div>
              <Label htmlFor="safetyConsiderations">Considerações de Segurança</Label>
              <Textarea
                id="safetyConsiderations"
                value={editedPlan?.safety_considerations || ''}
                onChange={(e) => setEditedPlan({ ...editedPlan, safety_considerations: e.target.value })}
                placeholder="Considerações médicas e de segurança"
                rows={3}
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}