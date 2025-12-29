import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { EvaluationRequest } from '@/hooks/useEvaluationRequests';
import { ComprehensiveEvaluationModal } from './ComprehensiveEvaluationModal';
import { CreateEvaluationData, useComprehensiveEvaluations } from '@/hooks/useComprehensiveEvaluations';
import { Calendar, Clock, MessageSquare, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentEvaluationRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: EvaluationRequest;
  onComplete: (requestId: string, evaluationId: string) => Promise<void>;
}

export function StudentEvaluationRequestModal({
  open,
  onOpenChange,
  request,
  onComplete
}: StudentEvaluationRequestModalProps) {
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { createEvaluation } = useComprehensiveEvaluations();

  const handleStartEvaluation = () => {
    setShowEvaluationForm(true);
  };

  const handleEvaluationSubmit = async (evaluationData: CreateEvaluationData) => {
    setIsCompleting(true);
    try {
      // Create the evaluation using the comprehensive evaluations hook
      const evaluation = await createEvaluation(evaluationData);
      
      // Complete the request with the evaluation ID
      await onComplete(request.id, evaluation.id);
      
      setShowEvaluationForm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing evaluation request:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const isExpired = request.due_date && new Date(request.due_date) < new Date();
  const daysUntilDue = request.due_date 
    ? Math.ceil((new Date(request.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <>
      <Dialog open={open && !showEvaluationForm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-2 sm:p-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solicitação de Avaliação
            </DialogTitle>
            <DialogDescription>
              Revise os detalhes da solicitação de avaliação e complete o processo respondendo ao questionário.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-6">
              {/* Status and Due Date */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{request.template?.name}</CardTitle>
                    <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                      {request.status === 'pending' && isExpired ? 'Expirado' : 
                       request.status === 'pending' ? 'Pendente' :
                       request.status === 'completed' ? 'Concluído' : 'Expirado'}
                    </Badge>
                  </div>
                  {request.template?.description && (
                    <CardDescription>{request.template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Due Date Info */}
                  {request.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Prazo: {format(new Date(request.due_date), 'PPP', { locale: ptBR })}
                      </span>
                      {daysUntilDue !== null && !isExpired && (
                        <Badge variant="outline">
                          {daysUntilDue === 0 ? 'Hoje' : 
                           daysUntilDue === 1 ? 'Amanhã' : 
                           `${daysUntilDue} dias`}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Creation Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Solicitado em: {format(new Date(request.created_at), 'PPP', { locale: ptBR })}
                    </span>
                  </div>

                  {/* Teacher Message */}
                  {request.message && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-4 w-4" />
                        Mensagem do Professor:
                      </div>
                      <div className="bg-muted p-3 rounded-md text-sm">
                        {request.message}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Como preencher</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Clique em "Começar Avaliação" para abrir o formulário</p>
                  <p>• Preencha todas as informações solicitadas com cuidado</p>
                  <p>• Suas respostas serão salvas automaticamente</p>
                  <p>• Após o envio, seu professor receberá uma notificação</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button 
              onClick={handleStartEvaluation}
              disabled={request.status !== 'pending' || isExpired}
            >
              Começar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Form Modal */}
      {showEvaluationForm && request.template && (
        <ComprehensiveEvaluationModal
          open={showEvaluationForm}
          onOpenChange={setShowEvaluationForm}
          studentId={request.student_id}
          studentName="" // Will be filled by the component
          onSubmit={handleEvaluationSubmit}
          preselectedTemplate={{
            id: request.template_id,
            name: request.template.name,
            description: request.template.description
          }}
        />
      )}
    </>
  );
}