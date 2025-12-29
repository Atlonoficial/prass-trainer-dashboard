import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Plus, Trash2, Edit3, Clock, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutLibrary, WorkoutTemplate } from '@/hooks/useWorkoutLibrary';
import ExerciseSelectionModal from './ExerciseSelectionModal';
import { ultraSanitizeWorkoutPayload, isPostgresSafe } from '@/utils/workoutPayloadSanitizer';

interface CreateWorkoutTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate?: WorkoutTemplate | null;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest_time: number;
  weight?: number;
  notes?: string;
  muscle_groups?: string[];
}

// Mapeamento de dificuldade
const DIFFICULTY_MAP: Record<string, string> = {
  'beginner': 'Iniciante',
  'intermediate': 'Intermediário',
  'advanced': 'Avançado'
};

const DIFFICULTY_REVERSE_MAP: Record<string, string> = {
  'Iniciante': 'beginner',
  'Intermediário': 'intermediate',
  'Avançado': 'advanced'
};

interface TemplateFormData {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | '';
  template_category: string;
  estimated_duration: number;
  estimated_calories: number;
  muscle_groups: string[];
  tags: string[];
  exercises: Exercise[];
}

export default function CreateWorkoutTemplateModal({
  isOpen,
  onClose,
  editingTemplate
}: CreateWorkoutTemplateModalProps) {
  const [showExerciseSelection, setShowExerciseSelection] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  const { createWorkoutTemplate, updateWorkoutTemplate } = useWorkoutLibrary();

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    difficulty: '',
    template_category: '',
    estimated_duration: 60,
    estimated_calories: 300,
    muscle_groups: [],
    tags: [], // NUNCA SERÁ ENVIADO - campo removido da funcionalidade
    exercises: []
  });

  // Preset categories
  const categories = [
    'Hipertrofia',
    'Emagrecimento',
    'Força',
    'Condicionamento',
    'Funcional',
    'Cardio',
    'Mobilidade',
    'Reabilitação'
  ];

  const muscleGroups = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
    'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha',
    'Core', 'Cardio'
  ];

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        difficulty: editingTemplate.difficulty as any || '',
        template_category: editingTemplate.template_category || '',
        estimated_duration: editingTemplate.estimated_duration || 60,
        estimated_calories: editingTemplate.estimated_calories || 300,
        muscle_groups: editingTemplate.muscle_groups || [],
        tags: [], // NUNCA usar - funcionalidade removida
        exercises: Array.isArray(editingTemplate.exercises) ? editingTemplate.exercises : []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        difficulty: '',
        template_category: '',
        estimated_duration: 60,
        estimated_calories: 300,
        muscle_groups: [],
        tags: [], // NUNCA usar - funcionalidade removida
        exercises: []
      });
    }
  }, [editingTemplate]);

  // Tags functionality REMOVED - no longer needed

  const handleMuscleGroupToggle = (muscle: string) => {
    setFormData(prev => ({
      ...prev,
      muscle_groups: prev.muscle_groups.includes(muscle)
        ? prev.muscle_groups.filter(m => m !== muscle)
        : [...prev.muscle_groups, muscle]
    }));
  };

  const handleAddExercise = (exercise: any) => {
    const newExercise: Exercise = {
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets || 3,
      reps: exercise.reps || 12,
      rest_time: exercise.rest_time || 60,
      weight: exercise.weight || 0,
      notes: exercise.notes || '',
      muscle_groups: exercise.muscle_groups || []
    };

    setFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));

    // Auto-add muscle groups
    if (newExercise.muscle_groups) {
      const newMuscleGroups = newExercise.muscle_groups.filter(
        mg => !formData.muscle_groups.includes(mg)
      );
      if (newMuscleGroups.length > 0) {
        setFormData(prev => ({
          ...prev,
          muscle_groups: [...prev.muscle_groups, ...newMuscleGroups]
        }));
      }
    }

    setShowExerciseSelection(false);
  };

  const handleUpdateExercise = (index: number, updates: Partial<Exercise>) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === index ? { ...ex, ...updates } : ex
      )
    }));
  };

  const handleRemoveExercise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      console.log('\n🎬 ============================================');
      console.log('🎬 MODAL - INICIANDO SALVAMENTO');
      console.log('🎬 ============================================');

      if (!formData.name.trim()) {
        toast.error('Nome do template é obrigatório');
        return;
      }

      if (formData.exercises.length === 0) {
        toast.error('Adicione pelo menos um exercício');
        return;
      }

      // ESTRATÉGIA MULTICAMADA: Construir payload com ultra-sanitização
      const templateData: any = {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        template_category: formData.template_category,
        image_url: null,
        estimated_duration: formData.estimated_duration,
        estimated_calories: formData.estimated_calories,
        exercises: formData.exercises // Coluna correta na tabela workouts
      };

      // Adicionar muscle_groups apenas se tiver conteúdo
      if (formData.muscle_groups && formData.muscle_groups.length > 0) {
        templateData.muscle_groups = formData.muscle_groups;
      }

      console.log('📦 [MODAL] Payload construído:', JSON.stringify(templateData, null, 2));

      // VALIDAÇÃO CRÍTICA PRÉ-ENVIO: Verificar segurança PostgreSQL
      const { sanitized, valid, errors } = ultraSanitizeWorkoutPayload(templateData);

      if (!valid) {
        console.error('❌ [MODAL] Validação falhou:', errors);
        toast.error(`Erro na validação: ${errors[0]}`);
        return;
      }

      if (!isPostgresSafe(sanitized)) {
        console.error('❌ [MODAL] Payload não é seguro para PostgreSQL');
        toast.error('Erro: Dados contêm arrays vazios incompatíveis com PostgreSQL');
        return;
      }

      console.log('✅ [MODAL] Validação passou, enviando para hook...\n');

      if (editingTemplate) {
        await updateWorkoutTemplate(editingTemplate.id, sanitized);
        toast.success('Template atualizado com sucesso!');
      } else {
        await createWorkoutTemplate(sanitized);
        toast.success('Template criado com sucesso!');
      }

      console.log('✅ ============================================');
      console.log('✅ MODAL - SALVAMENTO CONCLUÍDO');
      console.log('✅ ============================================\n');

      onClose();
    } catch (error: any) {
      console.error('\n❌ ============================================');
      console.error('❌ MODAL - ERRO NO SALVAMENTO');
      console.error('❌ ============================================');
      console.error('Erro completo:', error);
      console.error('Erro message:', error?.message);
      console.error('Erro code:', error?.code);
      console.error('============================================\n');

      const errorMessage = error?.message || 'Erro ao salvar template';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-3xl h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="w-9 h-9 p-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {editingTemplate ? 'Editar Template' : 'Criar Template de Treino'}
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {editingTemplate ? 'Modifique seu template existente' : 'Crie um novo template reutilizável'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Treino de Peito e Tríceps"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.template_category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, template_category: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva os objetivos e características deste treino..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Dificuldade</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a dificuldade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante</SelectItem>
                      <SelectItem value="intermediate">Intermediário</SelectItem>
                      <SelectItem value="advanced">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (min)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        estimated_duration: parseInt(e.target.value) || 0
                      }))}
                      className="pl-10 bg-background"
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calories">Calorias (kcal)</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="calories"
                      type="number"
                      value={formData.estimated_calories}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        estimated_calories: parseInt(e.target.value) || 0
                      }))}
                      className="pl-10 bg-background"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Muscle Groups */}
              <div className="space-y-3">
                <Label>Grupos Musculares</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {muscleGroups.map(muscle => (
                    <Button
                      key={muscle}
                      type="button"
                      variant={formData.muscle_groups.includes(muscle) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMuscleGroupToggle(muscle)}
                      className="text-xs"
                    >
                      {muscle}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Exercises */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Exercícios ({formData.exercises.length})</Label>
                  <Button
                    type="button"
                    onClick={() => setShowExerciseSelection(true)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Exercício
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.exercises.map((exercise, index) => (
                    <Card key={index} className="bg-muted/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{exercise.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingExerciseIndex(index)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveExercise(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {editingExerciseIndex === index ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Séries</Label>
                              <Input
                                type="number"
                                value={exercise.sets}
                                onChange={(e) => handleUpdateExercise(index, { sets: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Repetições</Label>
                              <Input
                                type="number"
                                value={exercise.reps}
                                onChange={(e) => handleUpdateExercise(index, { reps: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Descanso (s)</Label>
                              <Input
                                type="number"
                                value={exercise.rest_time}
                                onChange={(e) => handleUpdateExercise(index, { rest_time: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Peso (kg)</Label>
                              <Input
                                type="number"
                                value={exercise.weight || ''}
                                onChange={(e) => handleUpdateExercise(index, { weight: parseFloat(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <Button
                                size="sm"
                                onClick={() => setEditingExerciseIndex(null)}
                                className="mt-2"
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-6 text-sm text-muted-foreground">
                            <span><Target className="w-3 h-3 inline mr-1" />{exercise.sets}x{exercise.reps}</span>
                            <span><Clock className="w-3 h-3 inline mr-1" />{exercise.rest_time}s</span>
                            {exercise.weight && <span>💪 {exercise.weight}kg</span>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-6 border-t border-border">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  {editingTemplate ? 'Atualizar Template' : 'Criar Template'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseSelectionModal
        isOpen={showExerciseSelection}
        onClose={() => setShowExerciseSelection(false)}
        onSelectExercise={handleAddExercise}
      />
    </>
  );
}