import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEvaluationTemplates, EvaluationTemplate } from '@/hooks/useEvaluationTemplates'
import { CreateEvaluationData } from '@/hooks/useComprehensiveEvaluations'
import { Scale, Ruler, Users, ClipboardList, Star } from 'lucide-react'

interface ComprehensiveEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  onSubmit: (data: CreateEvaluationData) => Promise<void>
  preselectedTemplate?: {
    id: string;
    name: string;
    description?: string;
  };
}

export function ComprehensiveEvaluationModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSubmit,
  preselectedTemplate
}: ComprehensiveEvaluationModalProps) {
  const { templates, loading: templatesLoading } = useEvaluationTemplates()
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null)
  const [physicalMeasurements, setPhysicalMeasurements] = useState<Record<string, number>>({})
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [teacherNotes, setTeacherNotes] = useState('')
  const [overallScore, setOverallScore] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Set preselected template if provided
  useEffect(() => {
    if (preselectedTemplate && templates.length > 0 && !selectedTemplate) {
      const template = templates.find(t => t.id === preselectedTemplate.id);
      if (template) {
        setSelectedTemplate(template);
        handleTemplateSelect(preselectedTemplate.id);
      }
    }
  }, [preselectedTemplate, templates, selectedTemplate]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    setSelectedTemplate(template || null)
    
    // Initialize physical measurements
    if (template?.physical_measurements) {
      const initialMeasurements: Record<string, number> = {}
      template.physical_measurements.forEach((measurement: any) => {
        initialMeasurements[measurement.name] = 0
      })
      setPhysicalMeasurements(initialMeasurements)
    }
    
    // Initialize responses
    setResponses({})
  }

  const handleMeasurementChange = (name: string, value: number) => {
    setPhysicalMeasurements(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleResponseChange = (questionId: string, value: any, responseType: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { value, type: responseType }
    }))
  }

  const renderQuestionInput = (question: any) => {
    const questionId = question.id
    const currentValue = responses[questionId]?.value

    switch (question.type) {
      case 'text':
        return (
          <Input
            placeholder="Sua resposta..."
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(questionId, e.target.value, 'text')}
          />
        )
      
      case 'textarea':
        return (
          <Textarea
            placeholder="Escreva sua resposta detalhada..."
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(questionId, e.target.value, 'textarea')}
            rows={3}
          />
        )
      
      case 'select':
        return (
          <Select 
            value={currentValue || ''} 
            onValueChange={(value) => handleResponseChange(questionId, value, 'select')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${questionId}-${option}`}
                  checked={(currentValue || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = currentValue || []
                    const newValue = checked 
                      ? [...current, option]
                      : current.filter((v: string) => v !== option)
                    handleResponseChange(questionId, newValue, 'multiselect')
                  }}
                />
                <Label htmlFor={`${questionId}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )
      
      case 'scale':
        return (
          <div className="space-y-4">
            <Slider
              value={[currentValue || question.min || 1]}
              onValueChange={([value]) => handleResponseChange(questionId, value, 'scale')}
              min={question.min || 1}
              max={question.max || 10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{question.min || 1}</span>
              <span className="font-medium">{currentValue || question.min || 1}</span>
              <span>{question.max || 10}</span>
            </div>
          </div>
        )
      
      default:
        return (
          <Input
            placeholder="Sua resposta..."
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(questionId, e.target.value, 'text')}
          />
        )
    }
  }

  const handleSubmit = async () => {
    if (!selectedTemplate) return

    setLoading(true)
    try {
      const evaluationResponses = selectedTemplate.questions.map(question => ({
        question_id: question.id,
        question_text: question.question,
        response_type: question.type,
        response_value: responses[question.id]?.value || null
      }))

      const data: CreateEvaluationData = {
        student_id: studentId,
        template_id: selectedTemplate.id,
        physical_measurements: physicalMeasurements,
        responses: evaluationResponses,
        teacher_notes: teacherNotes,
        overall_score: overallScore > 0 ? overallScore : undefined
      }

      await onSubmit(data)
      
      // Reset form
      setSelectedTemplate(null)
      setPhysicalMeasurements({})
      setResponses({})
      setTeacherNotes('')
      setOverallScore(0)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting evaluation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Nova Avaliação Completa - {studentName}
          </DialogTitle>
          <DialogDescription>
            Crie uma avaliação completa para o aluno incluindo medidas físicas, questionário e observações do professor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Selecionar Template</CardTitle>
                <CardDescription>
                  {preselectedTemplate ? 'Template pré-selecionado' : 'Escolha um template de avaliação predefinido'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preselectedTemplate ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <div className="font-medium">{preselectedTemplate.name}</div>
                    {preselectedTemplate.description && (
                      <div className="text-sm text-muted-foreground">{preselectedTemplate.description}</div>
                    )}
                  </div>
                ) : (
                  <Select onValueChange={handleTemplateSelect} value={selectedTemplate?.id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {selectedTemplate && (
              <>
                {/* Physical Measurements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      2. Medidas Físicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedTemplate.physical_measurements.map((measurement: any) => (
                        <div key={measurement.name} className="space-y-2">
                          <Label className="flex items-center gap-2">
                            {measurement.label}
                            <Badge variant="secondary" className="text-xs">
                              {measurement.unit}
                            </Badge>
                            {measurement.required && (
                              <Badge variant="destructive" className="text-xs">*</Badge>
                            )}
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder={`0 ${measurement.unit}`}
                            value={physicalMeasurements[measurement.name] || ''}
                            onChange={(e) => handleMeasurementChange(
                              measurement.name, 
                              parseFloat(e.target.value) || 0
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Questionnaire */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      3. Questionário de Avaliação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {selectedTemplate.questions.map((question: any, index: number) => (
                        <div key={question.id} className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className="mt-1">
                              {index + 1}
                            </Badge>
                            <div className="flex-1 space-y-2">
                              <Label className="text-base font-medium">
                                {question.question}
                              </Label>
                              {renderQuestionInput(question)}
                            </div>
                          </div>
                          {index < selectedTemplate.questions.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Teacher Notes and Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      4. Avaliação do Professor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Observações do Professor</Label>
                      <Textarea
                        placeholder="Adicione suas observações sobre a avaliação..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Avaliação Geral (1-10)</Label>
                      <div className="space-y-4">
                        <Slider
                          value={[overallScore]}
                          onValueChange={([value]) => setOverallScore(value)}
                          min={0}
                          max={10}
                          step={0.5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>0</span>
                          <span className="font-medium">{overallScore}</span>
                          <span>10</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedTemplate || loading}
          >
            {loading ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}