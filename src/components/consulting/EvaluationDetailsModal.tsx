import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Evaluation } from '@/hooks/useComprehensiveEvaluations'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { translateEvaluationField } from '@/lib/evaluationFieldsMapping'
import { ClipboardList, Scale, User, MessageSquare, Star, Calendar, Activity } from 'lucide-react'

interface EvaluationDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evaluation: Evaluation | null
}

const formatResponseValue = (value: any, type: string) => {
  if (value === null || value === undefined) return 'Não respondido'
  
  switch (type) {
    case 'scale':
      return `${value}/10`
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : String(value)
    default:
      return String(value)
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800">Completa</Badge>
    case 'pending':
      return <Badge variant="secondary">Pendente</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const renderPhysicalMeasurements = (measurements: any) => {
  if (!measurements || Object.keys(measurements).length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma medida física registrada</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(measurements).map(([key, measurement]: [string, any]) => {
        const fieldMapping = translateEvaluationField(key)
        
        return (
          <div key={key} className="p-3 border rounded-lg bg-muted/30">
            <div className="font-medium text-sm">{fieldMapping.label}</div>
            <div className="text-lg font-semibold">
              {typeof measurement === 'object' && measurement.value !== undefined 
                ? `${measurement.value} ${measurement.unit || fieldMapping.unit}`
                : `${measurement} ${fieldMapping.unit}`
              }
            </div>
            {typeof measurement === 'object' && measurement.notes && (
              <div className="text-xs text-muted-foreground mt-1">{measurement.notes}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function EvaluationDetailsModal({
  open,
  onOpenChange,
  evaluation
}: EvaluationDetailsModalProps) {
  if (!evaluation) return null

  const isFromProgress = evaluation.id.startsWith('progress-')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFromProgress ? <Activity className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
            Detalhes da Avaliação
            {isFromProgress && (
              <Badge variant="secondary" className="ml-2">
                Histórico de Medidas
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {evaluation.student_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(evaluation.evaluation_date), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                      {getStatusBadge(evaluation.status)}
                    </CardDescription>
                  </div>
                  
                  {evaluation.overall_score && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{evaluation.overall_score}</div>
                      <div className="text-sm text-muted-foreground">Nota Geral</div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Template Info */}
            {evaluation.template && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Utilizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium">{evaluation.template.name}</div>
                    {evaluation.template.description && (
                      <div className="text-muted-foreground">{evaluation.template.description}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Physical Measurements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Medidas Físicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderPhysicalMeasurements(evaluation.physical_measurements)}
              </CardContent>
            </Card>

            {/* Questionnaire Responses */}
            {evaluation.responses && evaluation.responses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Respostas do Questionário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {evaluation.responses.map((response, index) => (
                      <div key={response.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            {index + 1}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-medium">{response.question_text}</div>
                            <div className="mt-1 p-2 bg-muted rounded text-sm">
                              {formatResponseValue(response.response_value, response.response_type)}
                            </div>
                          </div>
                        </div>
                        {index < evaluation.responses.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(evaluation.teacher_notes || evaluation.student_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evaluation.teacher_notes && (
                    <div>
                      <div className="font-medium text-sm mb-2">Observações do Professor:</div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                        {evaluation.teacher_notes}
                      </div>
                    </div>
                  )}
                  
                  {evaluation.student_notes && (
                    <div>
                      <div className="font-medium text-sm mb-2">Observações do Aluno:</div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                        {evaluation.student_notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}