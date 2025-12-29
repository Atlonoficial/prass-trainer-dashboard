import { useState, useCallback, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ChevronUp, ChevronDown, AlertCircle, RotateCcw } from 'lucide-react'
import { CustomQuestion, DEFAULT_QUESTIONS } from '@/hooks/useTeacherFeedbackSettings'
import { useToast } from '@/hooks/use-toast'
import { useOptimizedDebounce } from '@/hooks/useOptimizedDebounce'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CustomQuestionsEditorProps {
  questions: CustomQuestion[]
  onChange: (questions: CustomQuestion[]) => void
  maxQuestions?: number
}

const CustomQuestionsEditorComponent = ({ 
  questions, 
  onChange, 
  maxQuestions = 10 
}: CustomQuestionsEditorProps) => {
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [hasAutoImported, setHasAutoImported] = useState(false)

  // Debounced onChange para prevenir salvamentos excessivos
  const debouncedOnChange = useOptimizedDebounce(
    useCallback((newQuestions: CustomQuestion[]) => {
      onChange(newQuestions)
    }, [onChange]),
    500
  )

  // Auto-importar perguntas padrão se a lista estiver vazia (apenas uma vez)
  useEffect(() => {
    if (!hasAutoImported && questions.length === 0) {
      onChange(DEFAULT_QUESTIONS)
      setHasAutoImported(true)
    }
  }, [hasAutoImported, questions.length, onChange])

  const checkDuplicateQuestion = useCallback((questionText: string, currentId?: string): boolean => {
    const trimmedText = questionText.trim().toLowerCase()
    return questions.some(q => 
      q.id !== currentId && 
      q.question.trim().toLowerCase() === trimmedText
    )
  }, [questions])

  const addQuestion = useCallback(() => {
    if (questions.length >= maxQuestions) {
      toast({
        title: "Limite atingido",
        description: `Você pode configurar no máximo ${maxQuestions} perguntas personalizadas.`,
        variant: "destructive",
      })
      return
    }

    const newQuestion: CustomQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'text',
      required: false,
      order: questions.length,
      category: 'general',
    }

    onChange([...questions, newQuestion])
    setEditingId(newQuestion.id)
  }, [questions, onChange, maxQuestions, toast])

  const updateQuestion = useCallback((id: string, updates: Partial<CustomQuestion>) => {
    // Validar duplicata se estiver atualizando o texto da pergunta
    if (updates.question !== undefined) {
      const isDuplicate = checkDuplicateQuestion(updates.question, id)
      if (isDuplicate && updates.question.trim() !== '') {
        toast({
          title: "Pergunta duplicada",
          description: "Já existe uma pergunta com este texto. Por favor, use um texto diferente.",
          variant: "destructive",
        })
        return
      }
    }

    const updatedQuestions = questions.map(q => q.id === id ? { ...q, ...updates } : q)
    debouncedOnChange(updatedQuestions)
  }, [questions, debouncedOnChange, checkDuplicateQuestion, toast])

  const confirmRemoveQuestion = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const removeQuestion = useCallback(() => {
    const updatedQuestions = questions.filter(q => q.id !== deleteConfirmId)
    onChange(updatedQuestions)
    setDeleteConfirmId(null)
    toast({
      title: "Pergunta removida",
      description: "A pergunta personalizada foi removida com sucesso.",
    })
  }, [questions, deleteConfirmId, onChange, toast])

  const restoreDefaultQuestions = useCallback(() => {
    onChange(DEFAULT_QUESTIONS)
    toast({
      title: "Perguntas restauradas",
      description: `${DEFAULT_QUESTIONS.length} perguntas padrão do app do aluno foram restauradas.`,
    })
  }, [onChange, toast])

  const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newQuestions.length) return
    
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[newIndex]
    newQuestions[newIndex] = temp
    
    const reordered = newQuestions.map((q, i) => ({ ...q, order: i }))
    onChange(reordered)
  }, [questions, onChange])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Perguntas Personalizadas ({questions.length}/{maxQuestions})
          </p>
          <p className="text-xs text-muted-foreground">
            Estas perguntas serão exibidas no app do aluno
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={restoreDefaultQuestions}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma pergunta configurada
              </p>
              <Button onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Pergunta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        questions.map((question, index) => (
          <Card key={question.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">Pergunta {index + 1}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmRemoveQuestion(question.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Question Text */}
              <div className="space-y-2">
                <Label>Pergunta *</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                  placeholder="Digite a pergunta..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) => updateQuestion(question.id, { type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto Curto</SelectItem>
                      <SelectItem value="textarea">Texto Longo</SelectItem>
                      <SelectItem value="rating">Avaliação (1-5)</SelectItem>
                      <SelectItem value="select">Seleção Única</SelectItem>
                      <SelectItem value="multiselect">Múltipla Escolha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={question.category}
                    onValueChange={(value) => updateQuestion(question.id, { category: value as 'general' | 'workout' | 'diet' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="workout">Treino</SelectItem>
                      <SelectItem value="diet">Dieta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Placeholder */}
              <div className="space-y-2">
                <Label>Placeholder (opcional)</Label>
                <Input
                  value={question.placeholder || ''}
                  onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                  placeholder="Ex: Digite aqui..."
                />
              </div>

              {/* Options for select/multiselect */}
              {(question.type === 'select' || question.type === 'multiselect') && (
                <div className="space-y-2">
                  <Label>Opções (separadas por vírgula)</Label>
                  <Input
                    value={question.options?.join(', ') || ''}
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                      updateQuestion(question.id, { options })
                    }}
                    placeholder="Opção 1, Opção 2, Opção 3"
                  />
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Label>Campo obrigatório</Label>
                <Switch
                  checked={question.required}
                  onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Question Button */}
      {questions.length > 0 && questions.length < maxQuestions && (
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Pergunta ({questions.length}/{maxQuestions})
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A pergunta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeQuestion}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const CustomQuestionsEditor = memo(CustomQuestionsEditorComponent)
