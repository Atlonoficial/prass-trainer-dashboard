import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Search, Filter, Plus, Target, Dumbbell } from 'lucide-react';
import { useExercises } from '@/hooks/useExercises';
import { Loader2 } from 'lucide-react';

interface ExerciseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: any) => void;
}

export default function ExerciseSelectionModal({
  isOpen,
  onClose,
  onSelectExercise
}: ExerciseSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all-categories');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all-groups');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all-difficulties');

  const { exercises, loading } = useExercises();

  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = !searchTerm || 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.description && exercise.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all-categories' || exercise.category === selectedCategory;
    const matchesMuscleGroup = selectedMuscleGroup === 'all-groups' || 
      exercise.muscle_group === selectedMuscleGroup ||
      (exercise.muscle_groups && exercise.muscle_groups.includes(selectedMuscleGroup));
    const matchesDifficulty = selectedDifficulty === 'all-difficulties' || exercise.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesMuscleGroup && matchesDifficulty;
  });

  // Get unique values for filters
  const categories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))];
  const muscleGroups = [...new Set([
    ...exercises.map(ex => ex.muscle_group).filter(Boolean),
    ...exercises.flatMap(ex => ex.muscle_groups || [])
  ])];
  const difficulties = [...new Set(exercises.map(ex => ex.difficulty).filter(Boolean))];

  const handleSelectExercise = (exercise: any) => {
    onSelectExercise({
      ...exercise,
      sets: 3,
      reps: 12,
      rest_time: 60,
      weight: 0
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all-categories');
    setSelectedMuscleGroup('all-groups');
    setSelectedDifficulty('all-difficulties');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante':
      case 'beginner':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'intermediário':
      case 'intermediate':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'avançado':
      case 'advanced':
        return 'bg-red-500/10 text-red-600 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] p-0 flex flex-col">
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
                Selecionar Exercícios
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Escolha os exercícios para adicionar ao seu template
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="flex-shrink-0 p-6 pb-4 space-y-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercícios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-categories">Todas as categorias</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {muscleGroups.length > 0 && (
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Grupo muscular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-groups">Todos os grupos</SelectItem>
                    {muscleGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {difficulties.length > 0 && (
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-difficulties">Todas as dificuldades</SelectItem>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(searchTerm || 
                (selectedCategory && selectedCategory !== 'all-categories') || 
                (selectedMuscleGroup && selectedMuscleGroup !== 'all-groups') || 
                (selectedDifficulty && selectedDifficulty !== 'all-difficulties')) && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Exercises List */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Carregando exercícios...</p>
                </div>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium text-foreground">
                    {exercises.length === 0 ? 'Nenhum exercício disponível' : 'Nenhum resultado encontrado'}
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {exercises.length === 0 
                      ? 'Cadastre exercícios na biblioteca para utilizá-los aqui.'
                      : 'Tente ajustar os filtros ou buscar por outros termos.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExercises.map((exercise) => (
                  <Card 
                    key={exercise.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => handleSelectExercise(exercise)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {exercise.name}
                          </CardTitle>
                          {exercise.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {exercise.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {exercise.difficulty && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getDifficultyColor(exercise.difficulty)}`}
                          >
                            {exercise.difficulty}
                          </Badge>
                        )}
                        {exercise.category && (
                          <Badge variant="secondary" className="text-xs">
                            {exercise.category}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Exercise details */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {exercise.muscle_group && (
                            <div>🎯 {exercise.muscle_group}</div>
                          )}
                          {exercise.equipment && exercise.equipment.length > 0 && (
                            <div>🏋️ {exercise.equipment.join(', ')}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            <span>{exercise.sets || 3}x{exercise.reps || 12}</span>
                          </div>
                        </div>

                        {/* Muscle groups badges */}
                        {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {exercise.muscle_groups.slice(0, 3).map((group) => (
                              <Badge 
                                key={group} 
                                variant="outline" 
                                className="text-xs bg-muted/50"
                              >
                                {group}
                              </Badge>
                            ))}
                            {exercise.muscle_groups.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                +{exercise.muscle_groups.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button 
                          size="sm" 
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectExercise(exercise);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-2" />
                          Adicionar Exercício
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}