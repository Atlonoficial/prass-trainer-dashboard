import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Youtube, Video, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Exercise } from '@/hooks/useExercises';
import { VideoUpload } from '@/components/ui/video-upload';
import { difficultyMapping, muscleGroupMapping, categoryMapping, validateExerciseData, sanitizeExerciseData } from '@/lib/predefinitionsMapping';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise?: Exercise | null;
  onSave: (exercise: Omit<Exercise, 'id' | 'created_at'>) => void;
}

export default function AddExerciseModal({ isOpen, onClose, exercise, onSave }: AddExerciseModalProps) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [restTime, setRestTime] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [videoSource, setVideoSource] = useState<'upload' | 'url'>('upload');
  const { toast } = useToast();

  const muscleGroups = Object.keys(muscleGroupMapping);
  const difficultyLevels = Object.keys(difficultyMapping);
  const categories = Object.keys(categoryMapping.exercises);

  // Load exercise data for editing
  useEffect(() => {
    if (exercise) {
      setName(exercise.name || '');
      setMuscleGroup(exercise.muscle_group || '');
      setSets(exercise.sets?.toString() || '');
      setReps(exercise.reps?.toString() || '');
      setRestTime(exercise.rest_time?.toString() || '');
      setDifficulty(exercise.difficulty || '');
      setWeight(exercise.weight?.toString() || '');
      setDuration(exercise.duration?.toString() || '');
      setDescription(exercise.description || '');
      setCategory(exercise.category || '');
      setVideoUrl(exercise.video_url || '');
      setInstructions(exercise.instructions || '');
      
      // Detect if video URL is from local storage
      if (exercise.video_url?.includes('biblioteca-exercicios')) {
        setVideoSource('upload');
      } else {
        setVideoSource('url');
      }
    } else {
      resetForm();
    }
  }, [exercise, isOpen]);

  const resetForm = () => {
    setName('');
    setMuscleGroup('');
    setSets('');
    setReps('');
    setRestTime('');
    setDifficulty('');
    setWeight('');
    setDuration('');
    setDescription('');
    setCategory('');
    setVideoUrl('');
    setInstructions('');
    setVideoSource('upload');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create raw data object
    const rawData = {
      name: name.trim(),
      muscle_group: muscleGroup,
      sets: parseInt(sets),
      reps: parseInt(reps),
      rest_time: parseInt(restTime),
      difficulty,
      weight: weight ? parseFloat(weight) : null,
      duration: duration ? parseInt(duration) : null,
      description: description.trim() || null,
      category: category || null,
      video_url: videoUrl.trim() || null,
      instructions: instructions.trim() || null
    };

    // Validate data
    const validationErrors = validateExerciseData(rawData);
    if (validationErrors.length > 0) {
      toast({
        title: "Erro de validação",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    // Sanitize and map data to database format
    const exerciseData = sanitizeExerciseData(rawData);

    console.log('🚀 Sending exercise data:', exerciseData);

    onSave(exerciseData);
    
    toast({
      title: "Sucesso",
      description: exercise ? "Exercício atualizado com sucesso!" : "Exercício adicionado com sucesso!",
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    if (!exercise) resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-[95vw] h-auto max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleClose}
              size="sm"
              variant="ghost"
              className="p-2 h-auto"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {exercise ? 'Editar exercício' : 'Adicionar exercício'}
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {exercise ? 'Atualize as informações do exercício' : 'Adicione um novo exercício à sua biblioteca'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do exercício *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supino reto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscleGroup">Grupo muscular *</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Training Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sets">Séries *</Label>
              <Input
                id="sets"
                type="number"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="Ex: 3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reps">Repetições *</Label>
              <Input
                id="reps"
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Ex: 12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restTime">Descanso (seg) *</Label>
              <Input
                id="restTime"
                type="number"
                min="0"
                value={restTime}
                onChange={(e) => setRestTime(e.target.value)}
                placeholder="Ex: 60"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificuldade *</Label>
              <Select value={difficulty} onValueChange={setDifficulty} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex: 20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex: 30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o exercício..."
              rows={3}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções de execução</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Descreva como executar o exercício, posicionamento, dicas importantes..."
              rows={4}
            />
          </div>

          {/* Video/Media Section */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Mídia do Exercício
            </Label>
            
            <Tabs value={videoSource} onValueChange={(value) => setVideoSource(value as 'upload' | 'url')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload de Vídeo
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  URL Externa
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <VideoUpload
                  onUpload={(url) => setVideoUrl(url)}
                  currentVideo={videoSource === 'upload' ? videoUrl : ''}
                />
              </TabsContent>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl" className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    Link do vídeo (YouTube)
                  </Label>
                  <Input
                    id="videoUrl"
                    value={videoSource === 'url' ? videoUrl : ''}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o link completo do vídeo do YouTube para demonstração do exercício
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              {exercise ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}