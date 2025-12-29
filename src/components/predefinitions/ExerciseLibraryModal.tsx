import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Play, Filter, Grid, List, Video } from 'lucide-react'
import { useExercises, Exercise } from '@/hooks/useExercises'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface ExerciseLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectExercise?: (exercise: Exercise) => void
}

export function ExerciseLibraryModal({ isOpen, onClose, onSelectExercise }: ExerciseLibraryModalProps) {
  const { exercises, loading } = useExercises()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  // Mostrar todos os exercícios (não apenas os com vídeo)
  const exercisesToShow = exercises

  const filteredExercises = useMemo(() => {
    return exercisesToShow.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory
      const matchesMuscleGroup = selectedMuscleGroup === 'all' || exercise.muscle_group === selectedMuscleGroup
      const matchesDifficulty = selectedDifficulty === 'all' || exercise.difficulty === selectedDifficulty

      return matchesSearch && matchesCategory && matchesMuscleGroup && matchesDifficulty
    })
  }, [exercisesToShow, searchTerm, selectedCategory, selectedMuscleGroup, selectedDifficulty])

  const uniqueCategories = [...new Set(exercisesToShow.map(e => e.category).filter(Boolean))]
  const uniqueMuscleGroups = [...new Set(exercisesToShow.map(e => e.muscle_group).filter(Boolean))]
  const uniqueDifficulties = [...new Set(exercisesToShow.map(e => e.difficulty).filter(Boolean))]

  const handleExerciseClick = (exercise: Exercise) => {
    if (onSelectExercise) {
      onSelectExercise(exercise)
      onClose()
    }
  }

  const handleVideoPreview = (videoUrl: string) => {
    setSelectedVideo(videoUrl)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Biblioteca de Exercícios ({exercisesToShow.length} vídeos)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="px-6 pt-4 space-y-4 pb-4 border-b border-border/40 flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category!}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Músculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos músculos</SelectItem>
                  {uniqueMuscleGroups.map(muscle => (
                    <SelectItem key={muscle} value={muscle!}>
                      {muscle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas dificuldades</SelectItem>
                  {uniqueDifficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty!}>
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                  setSelectedMuscleGroup('all')
                  setSelectedDifficulty('all')
                }}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Exercise Grid/List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 pt-3">
            {loading ? (
              <LoadingSpinner message="Carregando biblioteca..." />
            ) : filteredExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou adicionar mais exercícios com vídeos
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredExercises.map(exercise => (
                  <div
                    key={exercise.id}
                    className="group relative border border-border/40 bg-card/50 backdrop-blur-sm rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleExerciseClick(exercise)}
                  >
                    <div className="relative aspect-video bg-muted">
                      {exercise.video_url ? (
                        <>
                          <video
                            src={exercise.video_url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div
                            className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVideoPreview(exercise.video_url!)
                            }}
                          >
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </>
                      ) : exercise.image_url && exercise.image_url.toLowerCase().includes('.gif') ? (
                        <>
                          <img
                            src={exercise.image_url}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVideoPreview(exercise.image_url!)
                            }}
                          >
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-1">{exercise.name}</h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">{exercise.muscle_group}</Badge>
                        <Badge variant="outline" className="text-xs">{exercise.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets}×{exercise.reps} • {exercise.rest_time}s descanso
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map(exercise => (
                  <div
                    key={exercise.id}
                    className="flex items-center gap-4 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => handleExerciseClick(exercise)}
                  >
                    <div className="relative w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {exercise.video_url ? (
                        <video
                          src={exercise.video_url}
                          className="w-full h-full object-cover rounded"
                          preload="metadata"
                          muted
                        />
                      ) : exercise.image_url && exercise.image_url.toLowerCase().includes('.gif') ? (
                        <img
                          src={exercise.image_url}
                          alt={exercise.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : exercise.image_url ? (
                        <img
                          src={exercise.image_url}
                          alt={exercise.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Video className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{exercise.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {exercise.description}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{exercise.muscle_group}</Badge>
                        <Badge variant="outline" className="text-xs">{exercise.difficulty}</Badge>
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <div>{exercise.sets}×{exercise.reps}</div>
                      <div>{exercise.rest_time}s</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Video Preview Modal */}
        {selectedVideo && (
          <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 pr-12 border-b border-border/40">
                <DialogTitle>Pré-visualização</DialogTitle>
              </DialogHeader>
              <div className="p-6">
                {selectedVideo.toLowerCase().includes('.gif') ? (
                  <img
                    src={selectedVideo}
                    alt="GIF do exercício"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video
                    src={selectedVideo}
                    controls
                    autoPlay
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}