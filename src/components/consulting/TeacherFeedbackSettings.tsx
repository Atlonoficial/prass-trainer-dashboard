import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, CheckCircle, Dumbbell, Utensils, User } from 'lucide-react'
import { useTeacherFeedbackSettings } from '@/hooks/useTeacherFeedbackSettings'
import { useToast } from '@/hooks/use-toast'
import { FeedbackSettingsCardsSkeleton } from './FeedbackSettingsCardsSkeleton'

const FeedbackSettingsCards = lazy(() => 
  import('./FeedbackSettingsCards').then(module => ({ default: module.FeedbackSettingsCards }))
)

export function TeacherFeedbackSettings() {
  const { settings, loading, updateSettings } = useTeacherFeedbackSettings()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    is_active: settings?.is_active ?? true,
    feedback_frequency: settings?.feedback_frequency ?? 'weekly',
    feedback_days: settings?.feedback_days ?? [1, 3, 5],
    custom_questions: settings?.custom_questions ?? [],
    feedback_retention_policy: settings?.feedback_retention_policy ?? '6months',
    default_feedback_period: settings?.default_feedback_period ?? 30,
    feedbacks_per_page: settings?.feedbacks_per_page ?? 10,
    show_feedback_stats: settings?.show_feedback_stats ?? true,
    feedback_types_enabled: settings?.feedback_types_enabled ?? ['workout', 'diet', 'general']
  })

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        is_active: settings.is_active,
        feedback_frequency: settings.feedback_frequency,
        feedback_days: settings.feedback_days,
        custom_questions: settings.custom_questions,
        feedback_retention_policy: settings.feedback_retention_policy,
        default_feedback_period: settings.default_feedback_period,
        feedbacks_per_page: settings.feedbacks_per_page,
        show_feedback_stats: settings.show_feedback_stats,
        feedback_types_enabled: settings.feedback_types_enabled
      })
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings(formData)
      const questionCount = formData.custom_questions?.length || 0
      toast({
        title: "✅ Configurações salvas",
        description: `${questionCount} pergunta(s) sincronizada(s) com o app do aluno`,
      })
      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      })
    }
  }

  const updateFormField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleFeedbackType = useCallback((type: string) => {
    setFormData(prev => {
      const current = prev.feedback_types_enabled
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type]
      
      return { ...prev, feedback_types_enabled: updated }
    })
  }, [])

  const feedbackTypes = [
    { key: 'workout', label: 'Treinos', icon: Dumbbell, color: 'bg-primary text-primary-foreground' },
    { key: 'diet', label: 'Dieta', icon: Utensils, color: 'bg-success text-success-foreground' },
    { key: 'general', label: 'Geral', icon: User, color: 'bg-info text-info-foreground' }
  ]

  if (loading) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Feedbacks
            <Badge variant="outline" className="ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Sincronizado com app do aluno
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Suspense fallback={<FeedbackSettingsCardsSkeleton />}>
          <FeedbackSettingsCards
            formData={formData}
            onUpdate={updateFormField}
            toggleFeedbackType={toggleFeedbackType}
            feedbackTypes={feedbackTypes}
          />
        </Suspense>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
