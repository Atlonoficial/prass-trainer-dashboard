import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  Repeat,
  Save,
  X
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useTrainingLocations } from '@/hooks/useTrainingLocations';
import { canStudentSchedule } from '@/lib/studentUtils';
import { useToast } from '@/hooks/use-toast';
import { getServicesForUI, normalizeServiceForBackend } from '@/lib/serviceMapping';

interface PeriodAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (appointments: any[]) => void;
  preSelectedStudentId?: string;
  isLoading?: boolean;
}

export default function PeriodAppointmentModal({ 
  isOpen, 
  onClose, 
  onSave,
  preSelectedStudentId,
  isLoading = false 
}: PeriodAppointmentModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    studentId: preSelectedStudentId || '',
    studentName: '',
    startDate: new Date(),
    endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    time: '',
    duration: '60',
    service: '',
    objective: '',
    academy: '',
    modality: '',
    location: '',
    notes: '',
    autoConfirm: false,
    sendReminder: true,
    allowReschedule: true,
    weekdays: [] as number[], // 0=Sunday, 1=Monday, etc
    recurrenceType: 'weekly' // weekly, biweekly
  });

  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(
    new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
  );

  const { students: allStudents } = useStudents();
  const { locations } = useTrainingLocations();
  
  const eligibleStudents = allStudents.filter(canStudentSchedule);
  const activeLocations = locations.filter(location => location.is_active);

  // Serviços 100% em português brasileiro
  const services = getServicesForUI();

  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
  ];

  const weekdayNames = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
  ];

  const handleStudentSelect = (studentId: string) => {
    const student = eligibleStudents.find(s => s.id === studentId);
    setFormData({
      ...formData,
      studentId,
      studentName: student?.name || ''
    });
  };

  const handleWeekdayToggle = (weekday: number, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        weekdays: [...formData.weekdays, weekday].sort()
      });
    } else {
      setFormData({
        ...formData,
        weekdays: formData.weekdays.filter(w => w !== weekday)
      });
    }
  };

  const generateAppointments = () => {
    if (!selectedStartDate || !selectedEndDate || formData.weekdays.length === 0) {
      return [];
    }

    const appointments = [];
    const [hours, minutes] = formData.time.split(':').map(Number);
    const currentDate = new Date(selectedStartDate);
    const endDate = new Date(selectedEndDate);
    
    let appointmentCounter = 0;

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (formData.weekdays.includes(dayOfWeek)) {
        // Check recurrence pattern
        const weeksSinceStart = Math.floor((currentDate.getTime() - selectedStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        if (formData.recurrenceType === 'weekly' || 
           (formData.recurrenceType === 'biweekly' && weeksSinceStart % 2 === 0)) {
          
          const appointmentDate = new Date(currentDate);
          appointmentDate.setHours(hours, minutes, 0, 0);

          appointments.push({
            id: `period-${Date.now()}-${appointmentCounter++}`,
            studentId: formData.studentId,
            studentName: formData.studentName,
            date: appointmentDate,
            time: formData.time,
            duration: formData.duration,
            service: normalizeServiceForBackend(formData.service), // Normalizar para o sistema
            type: 'recurring',
            
            // Mapeamento de serviço aplicado
            original_service_pt: formData.service,
            mapped_service: normalizeServiceForBackend(formData.service)
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return appointments;
  };

  const handleSave = () => {
    const appointments = generateAppointments();
    
    if (appointments.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum agendamento será criado. Verifique as datas e dias da semana selecionados.',
        variant: 'destructive'
      });
      return;
    }

    onSave?.(appointments);
    
    // Reset form
    setFormData({
      studentId: preSelectedStudentId || '',
      studentName: '',
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
      time: '',
      duration: '60',
      service: '',
      objective: '',
      academy: '',
      modality: '',
      location: '',
      notes: '',
      autoConfirm: false,
      sendReminder: true,
      allowReschedule: true,
      weekdays: [],
      recurrenceType: 'weekly'
    });
    setSelectedStartDate(new Date());
    setSelectedEndDate(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000));
    onClose();
  };

  const isFormValid = formData.studentId && formData.time && formData.service && 
                     formData.academy && formData.modality && formData.weekdays.length > 0;

  const previewAppointments = generateAppointments();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Repeat className="w-5 h-5" />
            <span>Agendamento em Período</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Seleção de Datas */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Calendar
                    mode="single"
                    selected={selectedStartDate}
                    onSelect={(date) => {
                      setSelectedStartDate(date);
                      setFormData({...formData, startDate: date || new Date()});
                    }}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Calendar
                    mode="single"
                    selected={selectedEndDate}
                    onSelect={(date) => {
                      setSelectedEndDate(date);
                      setFormData({...formData, endDate: date || new Date()});
                    }}
                    disabled={(date) => date < (selectedStartDate || new Date())}
                    className="rounded-md border"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do Aluno */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Informações do Aluno</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="student">Selecionar Aluno</Label>
                  <Select value={formData.studentId} onValueChange={handleStudentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um aluno..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex flex-col">
                            <span>{student.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.email} • {student.plan} • {student.mode}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Recorrência */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Repeat className="w-4 h-4" />
                  <span>Padrão de Repetição</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Frequência</Label>
                  <Select value={formData.recurrenceType} onValueChange={(value) => setFormData({...formData, recurrenceType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dias da Semana</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {weekdayNames.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`weekday-${day.value}`}
                          checked={formData.weekdays.includes(day.value)}
                          onCheckedChange={(checked) => handleWeekdayToggle(day.value, checked as boolean)}
                        />
                        <Label htmlFor={`weekday-${day.value}`} className="text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalhes do Agendamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Detalhes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="time">Horário</Label>
                    <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duração</Label>
                    <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                        <SelectItem value="90">90 min</SelectItem>
                        <SelectItem value="120">120 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={formData.service} onValueChange={(value) => setFormData({...formData, service: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Local</Label>
                  <Select value={formData.academy} onValueChange={(value) => setFormData({...formData, academy: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLocations.map((location) => (
                        <SelectItem key={location.id} value={location.name}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Modalidade</Label>
                  <Select value={formData.modality} onValueChange={(value) => setFormData({...formData, modality: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha a modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {previewAppointments.length} agendamentos serão criados
                  </p>
                  
                  {previewAppointments.length > 0 && (
                    <div className="text-xs text-muted-foreground max-h-40 overflow-y-auto space-y-1">
                      {previewAppointments.slice(0, 10).map((apt, index) => (
                        <div key={index} className="p-2 bg-muted/50 rounded">
                          {new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}
                        </div>
                      ))}
                      {previewAppointments.length > 10 && (
                        <div className="text-center">
                          +{previewAppointments.length - 10} mais...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid || isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Criando...' : `Criar ${previewAppointments.length} Agendamentos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}