import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Power, Calendar, AlertCircle, Database, Dumbbell, Utensils, User } from 'lucide-react'
import { CustomQuestionsEditor } from './CustomQuestionsEditor'
import type { CustomQuestion } from '@/hooks/useTeacherFeedbackSettings'

interface FeedbackSettingsCardsProps {
  formData: {
    is_active: boolean
    feedback_frequency: string
    feedback_days: number[]
    custom_questions: CustomQuestion[]
    feedback_retention_policy: string
    feedback_types_enabled: string[]
  }
  onUpdate: (field: string, value: any) => void
  toggleFeedbackType: (type: string) => void
  feedbackTypes: Array<{
    key: string
    label: string
    icon: any
    color: string
  }>
}

export function FeedbackSettingsCards({
  formData,
  onUpdate,
  toggleFeedbackType,
  feedbackTypes
}: FeedbackSettingsCardsProps) {
  const daysOfWeek = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' }
  ]

  const toggleDay = (day: number) => {
    const current = formData.feedback_days
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort()
    onUpdate('feedback_days', updated)
  }

  return (
    <div className="space-y-4">
      {/* Master Activation */}
      <Card className={!formData.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Power className="w-5 h-5" />
            Sistema de Feedbacks
          </CardTitle>
          <CardDescription>
            Ative ou desative o sistema completo de feedbacks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">
                Sistema Ativo
              </Label>
              <p className="text-sm text-muted-foreground">
                {formData.is_active ? 'Alunos podem enviar feedbacks' : 'Sistema desativado'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => onUpdate('is_active', checked)}
            />
          </div>

          {!formData.is_active && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O sistema está desativado. Os alunos não poderão enviar feedbacks pelo app.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Feedback Frequency */}
      <Card className={!formData.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Frequência de Feedbacks
          </CardTitle>
          <CardDescription>
            Configure quando os alunos devem enviar feedbacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência</Label>
            <Select
              disabled={!formData.is_active}
              value={formData.feedback_frequency}
              onValueChange={(value) => onUpdate('feedback_frequency', value)}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="biweekly">Quinzenalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="never">Nunca (Manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.feedback_frequency === 'weekly' || formData.feedback_frequency === 'biweekly') && (
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    disabled={!formData.is_active}
                    onClick={() => toggleDay(day.value)}
                    className={`
                      px-2 py-2 rounded-md text-xs font-medium transition-colors
                      ${formData.feedback_days.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                      ${!formData.is_active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Types */}
      <Card className={!formData.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Feedback</CardTitle>
          <CardDescription>
            Selecione quais tipos de feedback os alunos podem enviar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {feedbackTypes.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                type="button"
                disabled={!formData.is_active}
                onClick={() => toggleFeedbackType(key)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${formData.feedback_types_enabled.includes(key)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/50'
                  }
                  ${!formData.is_active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{label}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card className={!formData.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Perguntas Personalizadas</CardTitle>
          <CardDescription>
            Configure as perguntas que serão exibidas no app do aluno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomQuestionsEditor
            questions={formData.custom_questions}
            onChange={(questions) => onUpdate('custom_questions', questions)}
            maxQuestions={10}
          />
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className={!formData.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            Retenção de Dados
          </CardTitle>
          <CardDescription>
            Configure por quanto tempo os feedbacks serão armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Política de Retenção</Label>
            <Select
              disabled={!formData.is_active}
              value={formData.feedback_retention_policy}
              onValueChange={(value) => onUpdate('feedback_retention_policy', value)}
            >
              <SelectTrigger id="retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último ano</SelectItem>
                <SelectItem value="last10">Últimos 10 por aluno</SelectItem>
                <SelectItem value="unlimited">Ilimitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {formData.feedback_retention_policy === '6months' && '✓ Mantém feedbacks dos últimos 6 meses'}
              {formData.feedback_retention_policy === '1year' && '✓ Mantém feedbacks do último ano'}
              {formData.feedback_retention_policy === 'last10' && '✓ Mantém os 10 feedbacks mais recentes de cada aluno'}
              {formData.feedback_retention_policy === 'unlimited' && '✓ Mantém todos os feedbacks indefinidamente'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
