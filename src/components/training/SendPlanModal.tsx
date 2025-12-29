import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, X, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAIPlanPersistence } from '@/hooks/useAIPlanPersistence';
import { useAuth } from '@/hooks/useAuth';

interface SendPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  type: 'training' | 'diet';
  students: any[];
  preSelectedStudentId?: string;
}

export function SendPlanModal({ isOpen, onClose, plan, type, students, preSelectedStudentId }: SendPlanModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(preSelectedStudentId || '');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { savePlan } = useAIPlanPersistence();
  const { user } = useAuth();

  const selectedStudent = students.find(s => s.user_id === selectedStudentId);

  const handleSend = async () => {
    if (!selectedStudentId) {
      toast({
        title: "Erro",
        description: "Selecione um aluno para enviar o plano.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // 1. Salvar o plano usando o hook de persistência
      const savedPlan = await savePlan({
        plan,
        type,
        studentId: selectedStudentId,
        teacherId: user?.id
      });

      // 2. Enviar mensagem para o aluno (simulação - integrar com sistema de chat)
      const messageText = message || `Novo ${type === 'training' ? 'plano de treino' : 'plano alimentar'} gerado especialmente para você!`;
      
      console.log('Enviando mensagem:', {
        studentId: selectedStudentId,
        teacherId: user?.id,
        message: messageText,
        planId: savedPlan.id,
        planType: type
      });

      // Aqui você pode integrar com o sistema de chat real
      // await sendMessageToStudent(selectedStudentId, messageText, { planId: savedPlan.id, planType: type });

      toast({
        title: "Sucesso",
        description: `${type === 'training' ? 'Plano de treino' : 'Plano alimentar'} enviado para ${selectedStudent?.name || 'o aluno'} com sucesso!`,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao enviar plano:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o plano. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-2 sm:p-3">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Enviar {type === 'training' ? 'Plano de Treino' : 'Plano Alimentar'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Plano */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{plan?.name}</h4>
              {plan?.generation_context?.useAnamnesis && (
                <Badge variant="secondary">Baseado na Anamnese</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{plan?.description}</p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {type === 'training' ? (
                <>
                  <span>{plan?.exercises?.length || 0} exercícios</span>
                  <span>{plan?.duration_weeks || 4} semanas</span>
                </>
              ) : (
                <>
                  <span>{plan?.meals?.length || 0} refeições</span>
                  {plan?.daily_totals && <span>Totais configurados</span>}
                </>
              )}
              {plan?.generated_with_ai && <span>Gerado com IA</span>}
            </div>
          </Card>

          {/* Seleção do Aluno */}
          <div>
            <Label htmlFor="student">Selecionar Aluno</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um aluno..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.user_id} value={student.user_id}>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{student.name}</span>
                      {student.email && (
                        <span className="text-xs text-muted-foreground">({student.email})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem Personalizada */}
          <div>
            <Label htmlFor="message">Mensagem para o Aluno (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Olá! Preparei um ${type === 'training' ? 'plano de treino' : 'plano alimentar'} personalizado para você. Confira os detalhes e qualquer dúvida, entre em contato comigo!`}
              rows={4}
            />
          </div>

          {/* Preview da Mensagem */}
          {selectedStudent && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h5 className="font-medium text-primary mb-2">Preview da Mensagem</h5>
              <p className="text-sm">
                <strong>Para:</strong> {selectedStudent.name}
              </p>
              <p className="text-sm mt-2">
                {message || `Novo ${type === 'training' ? 'plano de treino' : 'plano alimentar'} gerado especialmente para você!`}
              </p>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !selectedStudentId}
              className="bg-primary hover:bg-primary/90"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Enviar Plano
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}