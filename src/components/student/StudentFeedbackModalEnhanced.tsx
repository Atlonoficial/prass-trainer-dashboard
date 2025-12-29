import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Star } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { CustomQuestion } from '@/hooks/useTeacherFeedbackSettings'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface FeedbackSubmissionResponse {
  success: boolean
  points_earned?: number
  error?: string
}

interface StudentFeedbackModalEnhancedProps {
  onFeedbackSent?: () => void
}

export function StudentFeedbackModalEnhanced({ onFeedbackSent }: StudentFeedbackModalEnhancedProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [feedbackType, setFeedbackType] = useState<'workout' | 'diet' | 'general'>('general')
  const [customResponses, setCustomResponses] = useState<Record<string, any>>({})
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [shouldShow, setShouldShow] = useState(false)
  const { toast } = useToast()

  // FASE 3.1 & 3.2: Otimização de Queries + Verificação de Ativação
  const fetchTeacherSettingsOptimized = async () => {
    try {
      setLoadingSettings(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Query otimizada com JOIN (FASE 3.1)
      const { data, error } = await supabase
        .from('students')
        .select('teacher_id, teacher:teacher_feedback_settings!inner(*)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data && data.teacher) {
        const teacherSettings = Array.isArray(data.teacher) ? data.teacher[0] : data.teacher
        
        // FASE 3.2: Verificação de ativação
        if (!teacherSettings.is_active) {
          setShouldShow(false)
          return
        }

        setTeacherId(data.teacher_id)
        setSettings(teacherSettings)
        
        // FASE 3.3: Lógica de Frequência
        const shouldShowModal = checkFrequency(teacherSettings)
        setShouldShow(shouldShowModal)
      }
    } catch (error) {
      console.error('Error fetching teacher settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  // FASE 3.3: Lógica de Frequência
  const checkFrequency = (teacherSettings: any): boolean => {
    const frequency = teacherSettings.feedback_frequency
    const lastFeedbackDate = localStorage.getItem('last_feedback_date')
    
    if (frequency === 'never') return false

    if (!lastFeedbackDate) return true

    const lastDate = new Date(lastFeedbackDate)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    switch (frequency) {
      case 'daily':
        return daysDiff >= 1
      case 'weekly':
        const currentWeekDay = now.getDay()
        const feedbackDays = teacherSettings.feedback_days || []
        return daysDiff >= 7 || (daysDiff >= 1 && feedbackDays.includes(currentWeekDay))
      case 'biweekly':
        return daysDiff >= 14
      case 'monthly':
        return daysDiff >= 30
      default:
        return daysDiff >= 7
    }
  }

  useEffect(() => {
    fetchTeacherSettingsOptimized()
  }, [])

  // FASE 3.4: Renderização Dinâmica de Perguntas
  const getFilteredQuestions = (): CustomQuestion[] => {
    if (!settings || !settings.custom_questions) return []
    return (settings.custom_questions as CustomQuestion[]).filter(
      q => q.category === feedbackType
    )
  }

  // FASE 3.5: Validação de Respostas
  const validateCustomResponses = (): { valid: boolean; missingQuestion?: string } => {
    const questions = getFilteredQuestions()
    
    for (const question of questions) {
      if (question.required) {
        const response = customResponses[question.id]
        
        if (!response || 
            (typeof response === 'string' && response.trim() === '') ||
            (Array.isArray(response) && response.length === 0)) {
          return { valid: false, missingQuestion: question.question }
        }

        if (question.type === 'rating') {
          const numResponse = Number(response)
          if (isNaN(numResponse) || numResponse < 1 || numResponse > 5) {
            return { valid: false, missingQuestion: question.question }
          }
        }
      }
    }
    
    return { valid: true }
  }

  // FASE 3.6: Submissão com Custom Responses
  const handleSubmit = async () => {
    if (!teacherId || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha sua mensagem de feedback.",
        variant: "destructive",
      })
      return
    }

    // FASE 3.5: Validação
    const validation = validateCustomResponses()
    if (!validation.valid) {
      toast({
        title: "Pergunta obrigatória não respondida",
        description: `Por favor, responda: ${validation.missingQuestion}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // FASE 3.6: Submissão com custom_responses
      const { data, error } = await supabase.rpc('submit_feedback_with_points_v5', {
        p_student_id: user.id,
        p_teacher_id: teacherId,
        p_type: feedbackType,
        p_rating: rating || 5,
        p_message: message,
        p_custom_responses: customResponses
      })

      if (error) throw error

      const result = data as unknown as FeedbackSubmissionResponse
      if (result?.success) {
        // Atualizar localStorage após envio bem-sucedido
        localStorage.setItem('last_feedback_date', new Date().toISOString())

        toast({
          title: "Feedback enviado!",
          description: `Você ganhou ${result.points_earned || 5} pontos! 🎉`,
        })

        setRating(0)
        setMessage('')
        setFeedbackType('general')
        setCustomResponses({})
        setIsOpen(false)
        onFeedbackSent?.()
      } else {
        toast({
          title: "Erro",
          description: result?.error || "Não foi possível enviar o feedback.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o feedback.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // FASE 3.4: Componentes de Input Dinâmico
  const renderQuestionInput = (question: CustomQuestion) => {
    const value = customResponses[question.id]

    switch (question.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setCustomResponses({ ...customResponses, [question.id]: e.target.value })}
            placeholder={question.placeholder}
            className="mt-2"
          />
        )
      
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => setCustomResponses({ ...customResponses, [question.id]: e.target.value })}
            placeholder={question.placeholder}
            className="mt-2 min-h-[80px]"
          />
        )
      
      case 'rating':
        return (
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 cursor-pointer transition-colors ${
                  star <= (value || 0) ? 'fill-primary text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setCustomResponses({ ...customResponses, [question.id]: star })}
              />
            ))}
          </div>
        )
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => setCustomResponses({ ...customResponses, [question.id]: val })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={question.placeholder || 'Selecione uma opção'} />
            </SelectTrigger>
            <SelectContent>
              {(question.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'multiselect':
        return (
          <div className="space-y-2 mt-2">
            {(question.options || []).map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = value || []
                    const updated = checked
                      ? [...current, option]
                      : current.filter((v: string) => v !== option)
                    setCustomResponses({ ...customResponses, [question.id]: updated })
                  }}
                />
                <label
                  htmlFor={`${question.id}-${option}`}
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  // FASE 3.2: Não renderizar se desativado
  if (!shouldShow || loadingSettings) {
    return null
  }

  const filteredQuestions = getFilteredQuestions()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Enviar Feedback
        </Button>
      </DialogTrigger>
      {/* FASE 3.7: Otimização Mobile */}
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Compartilhe sua experiência e ganhe pontos!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Feedback</Label>
            <Select value={feedbackType} onValueChange={(value: any) => {
              setFeedbackType(value)
              setCustomResponses({}) // Reset custom responses when changing type
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(settings?.feedback_types_enabled || []).map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type === 'workout' ? '🏋️ Treino' : type === 'diet' ? '🥗 Dieta' : '💬 Geral'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Avaliação Geral</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 sm:h-6 sm:w-6 cursor-pointer transition-colors ${
                    star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>

          {/* FASE 3.4: Perguntas Customizadas Dinâmicas */}
          {filteredQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label className="flex items-center gap-2">
                {question.question}
                {question.required && (
                  <Badge variant="destructive" className="text-xs">OBRIGATÓRIA</Badge>
                )}
              </Label>
              {renderQuestionInput(question)}
            </div>
          ))}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compartilhe seus pensamentos..."
              className="min-h-[100px] sm:min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !message.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? 'Enviando...' : 'Enviar Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
