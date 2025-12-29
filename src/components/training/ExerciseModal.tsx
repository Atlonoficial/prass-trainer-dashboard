import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, ChevronDown, ChevronUp, Trash2, Dumbbell, Plus } from 'lucide-react';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: any) => void;
}


export default function ExerciseModal({ isOpen, onClose, onSave }: ExerciseModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [series, setSeries] = useState('');
  const [restInterval, setRestInterval] = useState('');
  const [advancedTechnique, setAdvancedTechnique] = useState('');
  const [observations, setObservations] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { exercises, loading } = useExercises();

  const categories = [...new Set(exercises.map(ex => ex.muscle_group))].sort();

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || exercise.muscle_group === selectedCategory;
    const notSelected = !selectedExercises.find(selected => selected.id === exercise.id);
    return matchesSearch && matchesCategory && notSelected;
  });

  const addExercise = (exercise: Exercise) => {
    if (!selectedExercises.find(selected => selected.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise]);
      setSearchTerm('');
    }
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedExercises([]);
      setSeries('');
      setRestInterval('');
      setAdvancedTechnique('');
      setObservations('');
      setSearchTerm('');
      setSelectedCategory('all');
      setShowAdvancedOptions(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (selectedExercises.length > 0 && series) {
      onSave({
        exercises: selectedExercises,
        series,
        restInterval,
        advancedTechnique,
        observations
      });
      // Reset form
      setSelectedExercises([]);
      setSeries('');
      setRestInterval('');
      setAdvancedTechnique('');
      setObservations('');
      setSearchTerm('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border p-2 sm:p-3">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-foreground">Adicionar Exercício</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Selecione exercícios da sua biblioteca
              </DialogDescription>
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-foreground font-medium">Filtrar por categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-2 bg-background border-border text-foreground">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-foreground hover:bg-muted">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground font-medium">Buscar exercício</Label>
                <div className="relative mt-2">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o nome do exercício para buscar..."
                    className="pr-10 bg-background border-border text-foreground"
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                
                {(searchTerm || selectedCategory !== 'all') && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-background border border-border rounded-lg">
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                          onClick={() => addExercise(exercise)}
                        >
                          <div className="font-medium text-foreground">{exercise.name}</div>
                          <div className="text-sm text-muted-foreground">{exercise.muscle_group}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {exercise.sets}x{exercise.reps} • {exercise.rest_time}s descanso
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        Nenhum exercício encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Exercícios Selecionados */}
          {selectedExercises.length > 0 && (
            <div>
              <Label className="text-foreground font-medium">Exercícios Selecionados ({selectedExercises.length})</Label>
              <div className="mt-2 space-y-2">
                {selectedExercises.map((exercise) => (
                  <div key={exercise.id} className="flex items-center justify-between bg-muted p-3 rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{exercise.name}</div>
                      <div className="text-sm text-muted-foreground">{exercise.muscle_group}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {exercise.sets}x{exercise.reps} • {exercise.rest_time}s • {exercise.difficulty}
                      </div>
                      {exercise.video_url && (
                        <div className="text-xs text-primary mt-1">📹 Com vídeo demonstrativo</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(exercise.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão para expandir opções avançadas */}
          {selectedExercises.length > 0 && (
            <div>
              <div 
                className="flex items-center justify-between cursor-pointer p-3 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <Label className="text-foreground font-medium">Configurações do Treino</Label>
                {showAdvancedOptions ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              {/* Opções avançadas que aparecem quando expandido */}
              {showAdvancedOptions && (
                <div className="mt-4 space-y-4 p-4 bg-card rounded-lg border border-border shadow-sm animate-fade-in">
                  <div>
                    <Label className="text-foreground font-medium mb-2 block">Séries</Label>
                    <Textarea
                      value={series}
                      onChange={(e) => setSeries(e.target.value)}
                      placeholder="Ex: 3×12, 4×8-10, 3×15&#10;Detalhes adicionais sobre as séries..."
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      rows={3}
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-sm text-muted-foreground">Formato: séries x repetições (ex: 3×12, 4×8-10)</p>
                      <span className="text-sm text-muted-foreground">{series.length}/250</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground font-medium mb-2 block">Intervalo de Descanso</Label>
                    <Input
                      value={restInterval}
                      onChange={(e) => setRestInterval(e.target.value)}
                      placeholder="Ex: 60s, 1-2min, 90 segundos"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-sm text-muted-foreground">Tempo de descanso entre as séries</p>
                      <span className="text-sm text-muted-foreground">{restInterval.length}/50</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-foreground font-medium mb-2 block">Técnica Avançada</Label>
                    <Select value={advancedTechnique} onValueChange={setAdvancedTechnique}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue placeholder="Nenhuma técnica avançada" className="text-muted-foreground" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg">
                        <SelectItem value="drop-set" className="text-foreground hover:bg-muted">Drop Set</SelectItem>
                        <SelectItem value="super-set" className="text-foreground hover:bg-muted">Super Set</SelectItem>
                        <SelectItem value="rest-pause" className="text-foreground hover:bg-muted">Rest Pause</SelectItem>
                        <SelectItem value="negativas" className="text-foreground hover:bg-muted">Negativas</SelectItem>
                        <SelectItem value="isometria" className="text-foreground hover:bg-muted">Isometria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-foreground font-medium mb-2 block">Observações</Label>
                    <Textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Observações adicionais sobre o exercício..."
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={selectedExercises.length === 0 || !series}
              className="bg-primary hover:bg-primary/90"
            >
              Salvar Exercícios ({selectedExercises.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}