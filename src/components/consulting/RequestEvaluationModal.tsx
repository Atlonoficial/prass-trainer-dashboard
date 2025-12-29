import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvaluationTemplates } from '@/hooks/useEvaluationTemplates';
import { CreateEvaluationRequestData } from '@/hooks/useEvaluationRequests';
import { CalendarDays, MessageSquare, Users } from 'lucide-react';

interface RequestEvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  onSubmit: (data: CreateEvaluationRequestData) => Promise<void>;
}

export function RequestEvaluationModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSubmit
}: RequestEvaluationModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { templates, loading: templatesLoading } = useEvaluationTemplates();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleSubmit = async () => {
    if (!selectedTemplateId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        template_id: selectedTemplateId,
        student_id: studentId,
        due_date: dueDate || undefined,
        message: message || undefined
      });

      // Reset form
      setSelectedTemplateId('');
      setDueDate('');
      setMessage('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default due date to 7 days from now
  const defaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Solicitar Avaliação - {studentName}
          </DialogTitle>
          <DialogDescription>
            Solicite uma avaliação para o aluno selecionando um template e definindo prazos e instruções.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template de Avaliação *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template..." />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <SelectItem value="loading" disabled>
                    Carregando templates...
                  </SelectItem>
                ) : templates.length > 0 ? (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-templates" disabled>
                    Nenhum template disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{selectedTemplate.name}</CardTitle>
                {selectedTemplate.description && (
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Medidas Físicas:</strong> {selectedTemplate.physical_measurements?.length || 0} campos</p>
                  <p><strong>Perguntas:</strong> {selectedTemplate.questions?.length || 0} questões</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Prazo para Resposta
            </Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              placeholder={defaultDueDate()}
            />
            <p className="text-xs text-muted-foreground">
              Se não especificado, o prazo será de 7 dias a partir de hoje
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagem para o Aluno (Opcional)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem personalizada para explicar a avaliação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedTemplateId || isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}