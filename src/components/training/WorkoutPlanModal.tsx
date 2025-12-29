import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { WorkoutPlan, CreateWorkoutPlan } from '@/services/workoutPlansService'
import { useExercises } from '@/hooks/useExercises'
import { X, Plus, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'

interface WorkoutPlanModalProps {
  isOpen: boolean
  onClose: () => void
  editingPlan?: WorkoutPlan | null
  onSave: (plan: CreateWorkoutPlan) => Promise<WorkoutPlan | null>
}

interface ExerciseData {
  exerciseId: string
  name: string
  sets: number
  reps: number
  weight?: number
  duration?: number
  rest_time: number
  notes?: string
}

export function WorkoutPlanModal({ isOpen, onClose, editingPlan, onSave }: WorkoutPlanModalProps) {
  const [loading, setLoading] = useState(false)
  const { exercises } = useExercises()
  
  const [formData, setFormData] = useState<{
    name: string
    description: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    duration_weeks: number
    sessions_per_week: number
    is_template: boolean
    status: 'active' | 'inactive' | 'completed'
    notes: string
    tags: string[]
  }>({
    name: '',
    description: '',
    difficulty: 'beginner',
    duration_weeks: 4,
    sessions_per_week: 3,
    is_template: false,
    status: 'active',
    notes: '',
    tags: [] as string[]
  })

  const [exercisesData, setExercisesData] = useState<ExerciseData[]>([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name || '',
        description: editingPlan.description || '',
        difficulty: editingPlan.difficulty || 'beginner',
        duration_weeks: editingPlan.duration_weeks || 4,
        sessions_per_week: editingPlan.sessions_per_week || 3,
        is_template: editingPlan.is_template || false,
        status: editingPlan.status || 'active',
        notes: editingPlan.notes || '',
        tags: editingPlan.tags || []
      })
      setExercisesData(editingPlan.exercises_data || [])
    } else {
      setFormData({
        name: '',
        description: '',
        difficulty: 'beginner',
        duration_weeks: 4,
        sessions_per_week: 3,
        is_template: false,
        status: 'active',
        notes: '',
        tags: []
      })
      setExercisesData([])
    }
  }, [editingPlan, isOpen])

  const handleAddExercise = () => {
    setExercisesData(prev => [...prev, {
      exerciseId: '',
      name: '',
      sets: 3,
      reps: 12,
      weight: 0,
      duration: 0,
      rest_time: 60,
      notes: ''
    }])
  }

  const handleRemoveExercise = (index: number) => {
    setExercisesData(prev => prev.filter((_, i) => i !== index))
  }

  const handleExerciseChange = (index: number, field: keyof ExerciseData, value: any) => {
    setExercisesData(prev => prev.map((exercise, i) => 
      i === index ? { ...exercise, [field]: value } : exercise
    ))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome do plano é obrigatório')
      return
    }

    if (exercisesData.length === 0) {
      toast.error('Adicione pelo menos um exercício')
      return
    }

    // Validate exercises
    const invalidExercises = exercisesData.some(exercise => 
      !exercise.exerciseId || !exercise.name || exercise.sets <= 0 || exercise.reps <= 0
    )

    if (invalidExercises) {
      toast.error('Preencha todos os campos dos exercícios')
      return
    }

    setLoading(true)

    try {
      const planData = {
        ...formData,
        exercises_data: exercisesData
      }

      const result = await onSave(planData)
      
      if (result) {
        onClose()
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error)
      toast.error('Erro ao salvar plano de treino')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Editar Plano de Treino' : 'Novo Plano de Treino'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do plano de treino"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificuldade</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                  setFormData(prev => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_weeks">Duração (semanas)</Label>
              <Input
                id="duration_weeks"
                type="number"
                min="1"
                max="52"
                value={formData.duration_weeks}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  duration_weeks: parseInt(e.target.value) || 4 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessions_per_week">Sessões por semana</Label>
              <Input
                id="sessions_per_week"
                type="number"
                min="1"
                max="7"
                value={formData.sessions_per_week}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  sessions_per_week: parseInt(e.target.value) || 3 
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o objetivo e características do plano"
              rows={3}
            />
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_template"
                checked={formData.is_template}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_template: checked 
                }))}
              />
              <Label htmlFor="is_template">Usar como template</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'completed') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nova tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Exercícios</Label>
              <Button type="button" variant="outline" onClick={handleAddExercise}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exercício
              </Button>
            </div>

            {exercisesData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum exercício adicionado</p>
                <p className="text-sm">Clique em "Adicionar Exercício" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exercisesData.map((exercise, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Exercício {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Exercício</Label>
                        <Select
                          value={exercise.exerciseId}
                          onValueChange={(value) => {
                            const selectedExercise = exercises.find(ex => ex.id === value)
                            handleExerciseChange(index, 'exerciseId', value)
                            handleExerciseChange(index, 'name', selectedExercise?.name || '')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um exercício" />
                          </SelectTrigger>
                          <SelectContent>
                            {exercises.map((ex) => (
                              <SelectItem key={ex.id} value={ex.id}>
                                {ex.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome personalizado</Label>
                        <Input
                          value={exercise.name}
                          onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                          placeholder="Nome do exercício"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Séries</Label>
                        <Input
                          type="number"
                          min="1"
                          value={exercise.sets}
                          onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Repetições</Label>
                        <Input
                          type="number"
                          min="1"
                          value={exercise.reps}
                          onChange={(e) => handleExerciseChange(index, 'reps', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={exercise.weight || ''}
                          onChange={(e) => handleExerciseChange(index, 'weight', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descanso (segundos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={exercise.rest_time}
                          onChange={(e) => handleExerciseChange(index, 'rest_time', parseInt(e.target.value) || 60)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={exercise.notes || ''}
                        onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                        placeholder="Observações específicas para este exercício"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Gerais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações gerais sobre o plano"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : editingPlan ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}