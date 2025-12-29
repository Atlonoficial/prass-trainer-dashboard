import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAppointments, type Appointment } from '@/hooks/useAppointments';

interface StudentAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

export default function StudentAppointmentsModal({
  isOpen,
  onClose,
  studentId,
  studentName
}: StudentAppointmentsModalProps) {
  const { appointments, fetchAppointmentsByDateRange } = useAppointments();
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past'>('upcoming');
  const [historicalAppointments, setHistoricalAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Load full 3-month history for this student when modal opens
  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      fetchAppointmentsByDateRange(threeMonthsAgo, now).then(data => {
        const studentData = data.filter(a => a.student_id === studentId);
        setHistoricalAppointments(studentData);
        setLoading(false);
      });
    }
  }, [isOpen, studentId, fetchAppointmentsByDateRange]);

  // Combine current appointments with historical ones
  const allStudentAppointments = [
    ...appointments.filter(a => a.student_id === studentId),
    ...historicalAppointments.filter(ha => 
      !appointments.some(a => a.id === ha.id) // Avoid duplicates
    )
  ];
  
  const now = new Date();
  const upcomingAppointments = allStudentAppointments.filter(a => 
    new Date(a.scheduled_time) > now && (a.status || 'scheduled') !== 'cancelled'
  ).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  const pastAppointments = allStudentAppointments.filter(a => 
    new Date(a.scheduled_time) <= now
  ).sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'scheduled':
      case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'scheduled': return 'Agendado';
      case 'pending': return 'Pendente';
      default: return status || 'Agendado';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'scheduled':
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(appointment.status || 'scheduled')}
            <Badge className={`border ${getStatusColor(appointment.status || 'scheduled')}`}>
              {getStatusText(appointment.status || 'scheduled')}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {new Date(appointment.scheduled_time).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(appointment.scheduled_time).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{appointment.title || appointment.type || 'Consulta'}</span>
          </div>

          {appointment.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{appointment.location}</span>
            </div>
          )}

          {appointment.duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{appointment.duration} minutos</span>
            </div>
          )}

          {appointment.notes && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{appointment.status === 'cancelled' ? 'Motivo do cancelamento:' : 'Observações:'}</span>
                </div>
                <p className={`text-sm p-2 rounded-md ${
                  appointment.status === 'cancelled' 
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                    : 'bg-muted/50'
                }`}>
                  {appointment.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const currentAppointments = selectedTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] p-2 sm:p-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agendamentos - {studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={selectedTab === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedTab('upcoming')}
            >
              Próximos ({upcomingAppointments.length})
            </Button>
            <Button
              variant={selectedTab === 'past' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedTab('past')}
            >
              Anteriores ({pastAppointments.length})
            </Button>
          </div>

          {/* Appointments List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : currentAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {selectedTab === 'upcoming' 
                    ? 'Nenhum agendamento futuro'
                    : 'Nenhum agendamento anterior'
                  }
                </p>
                {selectedTab === 'past' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostrando histórico dos últimos 3 meses
                  </p>
                )}
              </div>
            ) : (
              <>
                {currentAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))}
                {selectedTab === 'past' && (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground">
                      Histórico limitado aos últimos 3 meses ({pastAppointments.length} agendamentos)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Summary */}
          <div className="pt-3 border-t">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="text-lg font-bold text-green-500">
                  {allStudentAppointments.filter(a => a.status === 'confirmed').length}
                </p>
                <p className="text-muted-foreground">Confirmados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-500">
                  {allStudentAppointments.filter(a => a.status === 'pending' || a.status === 'scheduled').length}
                </p>
                <p className="text-muted-foreground">Pendentes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">
                  {allStudentAppointments.filter(a => a.status === 'cancelled').length}
                </p>
                <p className="text-muted-foreground">Cancelados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">
                  {allStudentAppointments.length}
                </p>
                <p className="text-muted-foreground">Total (3m)</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}