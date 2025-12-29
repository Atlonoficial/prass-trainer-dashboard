import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Edit,
  ExternalLink,
  Target,
  FileText,
  Activity,
  Building
} from 'lucide-react';
import { type Appointment } from '@/hooks/useAppointments';
import { useTrainingLocations } from '@/hooks/useTrainingLocations';
import { formatDateTimeBrasilia } from '@/lib/timezone';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  studentProfile?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  } | null;
  onConfirm?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  onEdit?: (appointment: Appointment) => void;
}

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  studentProfile,
  onConfirm,
  onCancel,
  onEdit
}: AppointmentDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { locations } = useTrainingLocations();

  if (!appointment) return null;

  const trainingLocation = appointment.location_id 
    ? locations.find(loc => loc.id === appointment.location_id)
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/10 text-success border-success/20';
      case 'pending': 
      case 'scheduled': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      default: return status || 'Agendado';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'assessment': 
      case 'avaliacao': return 'bg-info/10 text-info border-info/20';
      case 'training':
      case 'treino': return 'bg-primary/10 text-primary border-primary/20';
      case 'consultation':
      case 'consulta': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getTypeText = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'assessment': return 'Avaliação';
      case 'training': return 'Treino';
      case 'consultation': return 'Consulta';
      case 'class': return 'Aula';
      default: return type || 'Consulta';
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'gym': return Building;
      case 'studio': return Building;
      case 'outdoor': return MapPin;
      case 'online': return ExternalLink;
      case 'home': return User;
      default: return MapPin;
    }
  };

  const handleConfirm = async () => {
    if (!onConfirm || !appointment) return;
    setIsLoading(true);
    try {
      await onConfirm(appointment.id);
      onClose();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || !appointment) return;
    setIsLoading(true);
    try {
      await onCancel(appointment.id);
      onClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dateTime = formatDateTimeBrasilia(appointment.scheduled_time);
  const canModify = appointment.status !== 'cancelled' && appointment.status !== 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <Badge className={getStatusColor(appointment.status || 'scheduled')}>
              {getStatusText(appointment.status || 'scheduled')}
            </Badge>
          </div>

          <Separator />

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{dateTime.date}</p>
                <p className="text-xs text-muted-foreground">Data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{dateTime.time}</p>
                <p className="text-xs text-muted-foreground">Horário</p>
              </div>
            </div>
          </div>

          {/* Aluno */}
          {studentProfile && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Aluno</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{studentProfile.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {studentProfile.email}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tipo de Sessão */}
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Tipo de Sessão</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <Badge className={getTypeColor(appointment.type || 'consultation')}>
                {getTypeText(appointment.type || 'consultation')}
              </Badge>
            </div>
            <p className="text-sm font-medium">{appointment.title}</p>
            {appointment.description && (
              <p className="text-xs text-muted-foreground">{appointment.description}</p>
            )}
          </div>

          {/* Informações do Aluno */}
          {(appointment.student_title || appointment.student_objectives || appointment.student_notes) && (
            <>
              <Separator />
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Informações do Aluno</p>
                </div>
                
                {appointment.student_title && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">Título Personalizado</p>
                    </div>
                    <p className="text-sm pl-5">{appointment.student_title}</p>
                  </div>
                )}
                
                {appointment.student_objectives && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">Objetivos</p>
                    </div>
                    <p className="text-sm pl-5">{appointment.student_objectives}</p>
                  </div>
                )}
                
                {appointment.student_notes && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">Observações do Aluno</p>
                    </div>
                    <p className="text-sm pl-5 bg-background/50 p-2 rounded border">{appointment.student_notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Local de Treinamento */}
          {(trainingLocation || appointment.location) && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Local de Treinamento</p>
                
                {trainingLocation && (
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getLocationTypeIcon(trainingLocation.type);
                        return <IconComponent className="w-4 h-4 text-accent" />;
                      })()}
                      <p className="text-sm font-semibold">{trainingLocation.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {trainingLocation.type === 'gym' ? 'Academia' :
                         trainingLocation.type === 'studio' ? 'Estúdio' :
                         trainingLocation.type === 'outdoor' ? 'Ao ar livre' :
                         trainingLocation.type === 'online' ? 'Online' :
                         trainingLocation.type === 'home' ? 'Domiciliar' : trainingLocation.type}
                      </Badge>
                    </div>
                    
                    {trainingLocation.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                        <p className="text-xs text-muted-foreground flex-1">{trainingLocation.address}</p>
                      </div>
                    )}
                    
                    {trainingLocation.description && (
                      <p className="text-xs text-muted-foreground pl-5">{trainingLocation.description}</p>
                    )}
                    
                    {trainingLocation.google_maps_link && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(trainingLocation.google_maps_link, '_blank')}
                        className="w-full mt-2"
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Ver no Google Maps
                      </Button>
                    )}
                  </div>
                )}
                
                {!trainingLocation && appointment.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{appointment.location}</p>
                  </div>
                )}
                
                {appointment.meeting_link && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(appointment.meeting_link, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {trainingLocation || appointment.location ? 'Link da Reunião' : 'Acessar Reunião Online'}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Reunião Online */}
          {appointment.meeting_link && !trainingLocation && !appointment.location && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Reunião Online</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(appointment.meeting_link, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Acessar Reunião
                </Button>
              </div>
            </>
          )}

          {/* Observações do Professor */}
          {appointment.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Observações do Professor</p>
                <p className="text-sm bg-muted/50 p-3 rounded-md border">{appointment.notes}</p>
              </div>
            </>
          )}

          {/* Duração e Preço */}
          {(appointment.duration || appointment.price) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {appointment.duration && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duração</p>
                    <p className="text-sm">{appointment.duration} min</p>
                  </div>
                )}
                {appointment.price && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor</p>
                    <p className="text-sm">R$ {Number(appointment.price).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ações */}
          {canModify && (
            <>
              <Separator />
              <div className="flex gap-2">
                {(appointment.status === 'pending' || appointment.status === 'scheduled') && onConfirm && (
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isLoading}
                    size="sm"
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                )}
                {appointment.status !== 'cancelled' && onCancel && (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel} 
                    disabled={isLoading}
                    size="sm"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                )}
                {onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onEdit(appointment);
                      onClose();
                    }}
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}