import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ScheduleConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: string;
}

export default function ScheduleConsultationModal({ isOpen, onClose, studentName, studentId }: ScheduleConsultationModalProps) {
  const { addAppointment } = useAppointments();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    studentName: studentName || '',
    date: '',
    time: '',
    type: 'avaliacao',
    duration: '60',
    notes: ''
  });

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  const consultationTypes = [
    { value: 'avaliacao', label: 'Avaliação Física' },
    { value: 'consultoria', label: 'Consultoria Nutricional' },
    { value: 'acompanhamento', label: 'Acompanhamento' },
    { value: 'revisao', label: 'Revisão de Treino' },
    { value: 'emergencia', label: 'Atendimento Emergencial' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado para criar agendamentos',
        variant: 'destructive'
      });
      return;
    }

    if (!studentId) {
      toast({
        title: 'Erro',
        description: 'ID do aluno não encontrado',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Combinar data e hora em timestamp ISO
      const scheduledTime = new Date(`${formData.date}T${formData.time}`);
      
      // Encontrar o label do tipo de consulta
      const typeLabel = consultationTypes.find(t => t.value === formData.type)?.label || formData.type;
      
      const appointmentData = {
        teacher_id: user.id,
        student_id: studentId,
        title: `${typeLabel} - ${formData.studentName}`,
        scheduled_time: scheduledTime.toISOString(),
        type: formData.type,
        duration: parseInt(formData.duration),
        notes: formData.notes || null,
        status: 'pending'
      };
      
      await addAppointment(appointmentData);
      
      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso!'
      });
      
      // Reset form
      setFormData({
        studentName: '',
        date: '',
        time: '',
        type: 'avaliacao',
        duration: '60',
        notes: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o agendamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Agendar Consulta</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="studentName">Nome do Aluno *</Label>
            <Input
              id="studentName"
              value={formData.studentName}
              onChange={(e) => setFormData({...formData, studentName: e.target.value})}
              placeholder="Digite o nome do aluno"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="time">Horário *</Label>
              <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Tipo de Consulta *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {consultationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
                <SelectItem value="90">90 minutos</SelectItem>
                <SelectItem value="120">120 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Observações sobre a consulta..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex items-center space-x-2" disabled={isSubmitting}>
              <Calendar className="w-4 h-4" />
              <span>{isSubmitting ? 'Agendando...' : 'Agendar'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}