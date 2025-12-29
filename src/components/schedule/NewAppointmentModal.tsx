import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Dumbbell,
  Video,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useTrainingLocations } from '@/hooks/useTrainingLocations';
import { useTimeSlotFiltering } from '@/hooks/useTimeSlotFiltering';
import { useImprovedAvailableSlots } from '@/hooks/useImprovedAvailableSlots';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { getServicesForUI, normalizeServiceForBackend } from '@/lib/serviceMapping';
import { ptBR } from 'date-fns/locale';
import { nowInBrasilia } from '@/lib/timezone';

// Hook simples para detecção de mobile (UX Mobile-First)
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (appointment: any) => void;
  preSelectedStudentId?: string;
  isLoading?: boolean;
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  onSave,
  preSelectedStudentId,
  isLoading = false
}: NewAppointmentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendAppointmentNotification } = useAppointmentNotifications();
  const isMobile = useIsMobile();

  const [formData, setFormData] = useState({
    studentId: preSelectedStudentId || '',
    studentName: '',
    date: new Date(),
    time: '',
    duration: '75',
    service: '',
    objective: '',
    academy: '',
    modality: '',
    location: '',
    notes: '',
    autoConfirm: false,
    sendReminder: true,
    allowReschedule: true
  });

  // Estado para "Forçar Agendamento" (Resiliência)
  const [forceSchedule, setForceSchedule] = useState(false);

  // FIX: Inicializar com meia-noite para garantir match visual no calendário
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const d = nowInBrasilia();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Hook para buscar alunos elegíveis
  const { students: allStudents } = useStudents();
  const { locations } = useTrainingLocations();

  const services = getServicesForUI();

  // Hooks para slots disponíveis
  const { getAvailableSlots, loading: slotsLoading } = useImprovedAvailableSlots();
  const [availableSlots, setAvailableSlots] = useState<Array<{ slot_start: string, slot_end: string }>>([]);

  // Filtrar apenas alunos que podem agendar
  const eligibleStudents = allStudents;
  const payingStudents = useMemo(() => eligibleStudents.filter(s => s.active_plan && s.active_plan !== 'free'), [eligibleStudents]);
  const freeStudents = useMemo(() => eligibleStudents.filter(s => !s.active_plan || s.active_plan === 'free'), [eligibleStudents]);

  // Filtrar apenas locais ativos
  const activeLocations = locations.filter(location => location.is_active);

  // Cleanup de dados sensíveis ao trocar de aluno (Privacidade)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      objective: '',
      notes: ''
    }));
  }, [formData.studentId]);

  // Buscar slots disponíveis com AbortController (Performance/Memory Leak)
  useEffect(() => {
    const controller = new AbortController();

    const fetchAvailableSlots = async () => {
      if (!selectedDate || !user?.id) return;

      try {
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);

        // Usar 75 minutos conforme configuração real do sistema
        const slots = await getAvailableSlots(user.id, startDate, endDate, 75);

        if (!controller.signal.aborted) {
          setAvailableSlots(slots);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao buscar slots disponíveis:', error);
          setAvailableSlots([]);
        }
      }
    };

    fetchAvailableSlots();

    return () => controller.abort();
  }, [selectedDate, user?.id, getAvailableSlots]);

  // Converter slots para formato de horários da UI
  const timeSlots = availableSlots.map(slot => {
    const time = new Date(slot.slot_start);
    return time.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }).filter(time => time && time !== 'Invalid Date').sort();

  const handleStudentSelect = (studentId: string) => {
    const student = eligibleStudents.find(s => s.id === studentId);
    setFormData({
      ...formData,
      studentId,
      studentName: student?.name || ''
    });
  };

  // Handler para input nativo de data (Mobile)
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      // Criar data preservando o dia local
      const [year, month, day] = dateStr.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setSelectedDate(newDate);
    }
  };

  const handleSave = async () => {
    // Validação crítica de dados
    if (!formData.studentId || !selectedDate || !formData.time) {
      const missing = [];
      if (!formData.studentId) missing.push('Estudante');
      if (!selectedDate) missing.push('Data');
      if (!formData.time) missing.push('Horário');
      if (!formData.service) missing.push('Serviço');

      toast({
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${missing.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    // Validar se o estudante pertence ao professor
    const selectedStudent = eligibleStudents.find(s => s.id === formData.studentId)
    if (!selectedStudent) {
      toast({
        title: "Erro",
        description: "Estudante selecionado não é válido.",
        variant: "destructive",
      })
      return
    }

    // FIX: Timezone Hell - Construção manual da string ISO
    // Ignora o fuso do navegador e cria uma string ISO "na marra" com o horário escolhido
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const [hours, minutes] = formData.time.split(':');

    // Formato: YYYY-MM-DDTHH:mm:00.000Z (Assumindo que o input é o horário desejado em UTC ou local do servidor)
    // Para garantir consistência, usamos o horário local do evento como "verdade"
    const isoString = `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;

    // Dados formatados corretamente
    const appointmentData = {
      student_id: selectedStudent.user_id,
      scheduled_time: isoString, // Envia string ISO construída manualmente
      duration: parseInt(formData.duration),
      type: normalizeServiceForBackend(formData.service),
      title: formData.service || 'Agendamento',
      description: formData.notes,
      location: formData.modality === 'presencial' ? formData.location : undefined,
      student_title: formData.objective,
      student_objectives: formData.objective,
      student_notes: formData.notes
    }

    // Chamar callback de salvamento
    onSave?.(appointmentData);

    // Enviar notificação automática para o aluno (Sanitizada)
    try {
      await sendAppointmentNotification(
        selectedStudent.user_id,
        {
          scheduled_time: appointmentData.scheduled_time,
          type: appointmentData.type,
          title: appointmentData.title, // Título genérico ou do serviço
          teacher_name: user?.email || 'Seu Professor'
          // REMOVIDO: notes e objectives para proteger privacidade (Guideline 5.1.1)
        }
      );
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    // Reset form
    setFormData({
      studentId: '',
      studentName: '',
      date: new Date(),
      time: '',
      duration: '75',
      service: '',
      objective: '',
      academy: '',
      modality: '',
      location: '',
      notes: '',
      autoConfirm: false,
      sendReminder: true,
      allowReschedule: true
    });
    setSelectedDate(new Date());
    setForceSchedule(false);
    onClose();
  };

  const isFormValid = formData.studentId && formData.time && formData.service;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto z-50 p-6 md:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <span>Novo Agendamento</span>
          </DialogTitle>
        </DialogHeader>

        {/* Layout Responsivo: Mobile (coluna única, form primeiro) vs Desktop (duas colunas) */}
        <div className={`grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start ${isMobile ? 'flex flex-col-reverse' : ''}`}>

          {/* Coluna Esquerda: Calendário (Desktop) ou Input Nativo (Mobile) */}
          <div className="flex flex-col items-center lg:items-start space-y-4 w-full lg:w-auto">
            {isMobile ? (
              <div className="w-full space-y-2">
                <Label>Data do Agendamento</Label>
                <Input
                  type="date"
                  className="w-full h-12 text-lg"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={handleNativeDateChange}
                />
                <p className="text-xs text-muted-foreground">Selecione a data para ver horários</p>
              </div>
            ) : (
              // Calendário Desktop (Shadcn)
              <Card className="bg-card border-border w-full">
                <CardContent className="p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full"
                    locale={ptBR}
                    classNames={{
                      months: "flex w-full flex-col space-y-4",
                      month: "space-y-4 w-full flex flex-col",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
                      row: "flex w-full mt-2",
                      cell: "relative text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                      day: "h-8 w-8 p-0 font-normal text-center text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground mx-auto",
                      day_selected: "bg-yellow-500 text-black hover:bg-yellow-600 hover:text-black focus:bg-yellow-500 focus:text-black font-semibold relative z-10",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {!isMobile && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>Selecionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span>Hoje</span>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Formulário */}
          <div className="flex flex-col gap-6 w-full">

            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/80">Selecionar Aluno</Label>
              <Select value={formData.studentId} onValueChange={handleStudentSelect}>
                <SelectTrigger className="h-11 bg-background/50 border-input/50 focus:ring-primary/20 transition-all">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Escolha um aluno..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {eligibleStudents.length > 0 ? (
                    <>
                      {payingStudents.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-sm mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ALUNOS PAGANTES
                          </SelectLabel>
                          {payingStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id} className="pl-4">
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}

                      {freeStudents.length > 0 && (
                        <SelectGroup>
                          {payingStudents.length > 0 && <div className="h-px bg-border/50 my-2" />}
                          <SelectLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-sm mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            ALUNOS GRATUITOS
                          </SelectLabel>
                          {freeStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id} className="pl-4">
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {allStudents.length > 0
                        ? "Nenhum aluno elegível encontrado (verifique planos/status)"
                        : "Nenhum aluno cadastrado no sistema"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/80">Horário</Label>
                {isMobile ? (
                  <Input
                    type="time"
                    className="h-11"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                ) : (
                  <Select
                    value={formData.time}
                    onValueChange={(val) => setFormData({ ...formData, time: val })}
                    disabled={slotsLoading || !selectedDate}
                  >
                    <SelectTrigger className="h-11 bg-background/50 border-input/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder={slotsLoading ? "Carregando..." : "--:--"} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {timeSlots.length > 0 ? (
                        timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {slotsLoading ? "Buscando horários..." : "Sem horários disponíveis"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/80">Duração</Label>
                <Select value={formData.duration} onValueChange={(val) => setFormData({ ...formData, duration: val })}>
                  <SelectTrigger className="h-11 bg-background/50 border-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="75">75 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fallback de Resiliência: Forçar Agendamento */}
            {timeSlots.length === 0 && !slotsLoading && selectedDate && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                <Checkbox
                  id="force-schedule"
                  checked={forceSchedule}
                  onCheckedChange={(checked) => setForceSchedule(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="force-schedule"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-yellow-600 dark:text-yellow-400"
                  >
                    Forçar agendamento (Ignorar conflitos)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use se tiver certeza que o horário está livre.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/80">Serviço</Label>
              <Select value={formData.service} onValueChange={(val) => setFormData({ ...formData, service: val })}>
                <SelectTrigger className="h-11 bg-background/50 border-input/50">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione o serviço..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/80">Objetivo do Treino</Label>
              <Textarea
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Descreva o objetivo principal desta sessão..."
                className="min-h-[80px] bg-background/50 border-input/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/80">Local</Label>
                <Select value={formData.academy} onValueChange={(val) => setFormData({ ...formData, academy: val })}>
                  <SelectTrigger className="h-11 bg-background/50 border-input/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Local..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {activeLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/80">Modalidade</Label>
                <Select value={formData.modality} onValueChange={(val) => setFormData({ ...formData, modality: val })}>
                  <SelectTrigger className="h-11 bg-background/50 border-input/50">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Tipo..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder" className="text-sm font-medium cursor-pointer">Enviar Lembrete</Label>
                  <p className="text-xs text-muted-foreground">Notificar aluno 1h antes</p>
                </div>
                <Switch
                  id="reminder"
                  checked={formData.sendReminder}
                  onCheckedChange={(c) => setFormData({ ...formData, sendReminder: c })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor="reschedule" className="text-sm font-medium cursor-pointer">Permitir Reagendamento</Label>
                  <p className="text-xs text-muted-foreground">Até 2h antes do treino</p>
                </div>
                <Switch
                  id="reschedule"
                  checked={formData.allowReschedule}
                  onCheckedChange={(c) => setFormData({ ...formData, allowReschedule: c })}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-border/50 mt-6">
          <Button variant="outline" onClick={onClose} className="h-11 px-6">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={(!isFormValid && !forceSchedule) || isLoading}
            className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Criando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}