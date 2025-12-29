import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  X 
} from 'lucide-react';
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
}

export default function SendMessageModal({ isOpen, onClose, studentName, studentId }: SendMessageModalProps) {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { getOrCreateConversation, sendMessage } = useChat();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }
    if (!message.trim() || !subject.trim()) return;

    setSending(true);
    try {
      const conversationId = await getOrCreateConversation(studentId, user.id);
      const fullMessage = `Assunto: ${subject}\n\n${message}`;
      await sendMessage(conversationId, fullMessage, user.id, 'teacher');
      toast({ title: 'Enviado', description: 'Mensagem enviada com sucesso' });
      // Reset form
      setMessage('');
      setSubject('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a mensagem', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Enviar Mensagem para {studentName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto da mensagem..."
            />
          </div>

          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={5}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={!message.trim() || !subject.trim() || sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}