import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Clock, Zap, Users, Plus, Filter, ArrowLeft } from 'lucide-react';
import { useWorkoutLibrary } from '@/hooks/useWorkoutLibrary';
import { useToast } from '@/hooks/use-toast';
import { WorkoutTemplate } from '@/hooks/useWorkoutLibrary';

interface WorkoutSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkout: (workout: WorkoutTemplate) => void;
}

export default function WorkoutSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectWorkout 
}: WorkoutSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all-categories');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all-groups');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all-difficulties');
  
  const { toast } = useToast();
  const {
    workouts,
    loading,
    error,
    searchWorkouts,
    getWorkoutsByCategory,
    getWorkoutsByMuscleGroup,
    getCategories,
    getMuscleGroups
  } = useWorkoutLibrary();

  // Filter workouts based on current filters
  const filteredWorkouts = useState(() => {
    let result = workouts;

    if (searchQuery.trim()) {
      result = searchWorkouts(searchQuery);
    }

    if (selectedCategory && selectedCategory !== 'all-categories') {
      result = result.filter(w => w.template_category === selectedCategory);
    }

    if (selectedMuscleGroup && selectedMuscleGroup !== 'all-groups') {
      result = result.filter(w => 
        w.muscle_groups && w.muscle_groups.includes(selectedMuscleGroup)
      );
    }

    if (selectedDifficulty && selectedDifficulty !== 'all-difficulties') {
      result = result.filter(w => w.difficulty === selectedDifficulty);
    }

    return result;
  })[0];

  const handleSelectWorkout = (workout: WorkoutTemplate) => {
    onSelectWorkout(workout);
    toast({
      title: "Treino selecionado",
      description: `${workout.name} foi adicionado ao plano.`
    });
    onClose();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all-categories');
    setSelectedMuscleGroup('all-groups');
    setSelectedDifficulty('all-difficulties');
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
      case 'iniciante':
        return 'bg-success/10 text-success border-success/30';
      case 'intermediate':
      case 'intermediário':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'advanced':
      case 'avançado':
        return 'bg-critical/10 text-critical border-critical/30';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/30';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-4xl h-[80vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Biblioteca de Treinos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-critical text-4xl">⚠️</div>
              <h3 className="text-lg font-semibold text-foreground">Erro ao carregar treinos</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={onClose} variant="outline">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[85vh] bg-card border-border p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Biblioteca de Treinos
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Selecione um treino para adicionar ao plano
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-6 pt-4 overflow-hidden">
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar treinos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-input"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">Todas as categorias</SelectItem>
                  {getCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue placeholder="Grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-groups">Todos os grupos</SelectItem>
                  {getMuscleGroups().map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-difficulties">Todas as dificuldades</SelectItem>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || 
                (selectedCategory && selectedCategory !== 'all-categories') || 
                (selectedMuscleGroup && selectedMuscleGroup !== 'all-groups') || 
                (selectedDifficulty && selectedDifficulty !== 'all-difficulties')) && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Workouts Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredWorkouts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground text-6xl">🏋️</div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {workouts.length === 0 ? 'Nenhum treino encontrado' : 'Nenhum resultado'}
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {workouts.length === 0 
                      ? 'Crie seu primeiro template de treino para aparecer aqui.'
                      : 'Tente ajustar os filtros ou buscar por outros termos.'
                    }
                  </p>
                  {workouts.length === 0 && (
                    <Button onClick={onClose} className="mt-4">
                      Criar Novo Treino
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkouts.map((workout) => (
                  <Card 
                    key={workout.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => handleSelectWorkout(workout)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {workout.name}
                          </CardTitle>
                          {workout.description && (
                            <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {workout.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {workout.difficulty && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getDifficultyColor(workout.difficulty)}`}
                          >
                            {workout.difficulty === 'beginner' ? 'Iniciante' : 
                             workout.difficulty === 'intermediate' ? 'Intermediário' : 
                             workout.difficulty === 'advanced' ? 'Avançado' : 
                             workout.difficulty}
                          </Badge>
                        )}
                        {workout.template_category && (
                          <Badge variant="secondary" className="text-xs">
                            {workout.template_category}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(workout.estimated_duration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span>{workout.estimated_calories || 0} cal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{workout.exercises?.length || 0} ex.</span>
                        </div>
                      </div>

                      {workout.muscle_groups && workout.muscle_groups.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {workout.muscle_groups.slice(0, 3).map((group) => (
                              <Badge 
                                key={group} 
                                variant="outline" 
                                className="text-xs bg-muted/50"
                              >
                                {group}
                              </Badge>
                            ))}
                            {workout.muscle_groups.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                +{workout.muscle_groups.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectWorkout(workout);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-2" />
                        Adicionar ao Plano
                      </Button>
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