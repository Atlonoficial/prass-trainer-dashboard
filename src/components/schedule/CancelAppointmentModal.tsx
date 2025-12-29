import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { Appointment } from '@/hooks/useAppointments';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notifyStudent: boolean, releaseSlot?: boolean) => void;
  appointment: Appointment | null;
}

const CANCELLATION_REASONS = [
  'Emergência pessoal',
  'Problema de saúde',
  'Compromisso profissional urgente',
  'Problema na academia/local',
  'Reagendamento solicitado pelo aluno',
  'Indisponibilidade do professor',
  'Feriado/Data especial',
  'Outro motivo'
];

export default function CancelAppointmentModal({
  isOpen,
  onClose,
  onConfirm,
  appointment
}: CancelAppointmentModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [releaseSlot, setReleaseSlot] = useState(true);

  const handleCancel = () => {
    const reason = selectedReason === 'Outro motivo' ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason.trim(), notifyStudent, releaseSlot);
      setSelectedReason('');
      setCustomReason('');
      setNotifyStudent(true);
      setReleaseSlot(true);
      onClose();
    }
  };

  const isCustomReason = selectedReason === 'Outro motivo';
  const finalReason = isCustomReason ? customReason : selectedReason;
  const isValid = finalReason.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancelar Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {appointment && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                {new Date(appointment.scheduled_time).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointment.title || appointment.type}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Motivo do cancelamento *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustomReason && (
            <div>
              <Label htmlFor="customReason">Descreva o motivo</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Explique o motivo do cancelamento..."
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Notificar aluno
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                O aluno receberá uma notificação com o motivo
              </p>
            </div>
            <Button
              variant={notifyStudent ? "default" : "outline"}
              size="sm"
              onClick={() => setNotifyStudent(!notifyStudent)}
            >
              {notifyStudent ? "Sim" : "Não"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Liberar horário para outros alunos
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                O horário ficará disponível para novos agendamentos
              </p>
            </div>
            <Button
              variant={releaseSlot ? "default" : "outline"}
              size="sm"
              onClick={() => setReleaseSlot(!releaseSlot)}
            >
              {releaseSlot ? "Sim" : "Não"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Manter Agendamento
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={!isValid}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancelar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}