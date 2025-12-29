import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Calendar, User, Target, MessageSquare, MapPin, Video } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import { StudentAppointmentDetails } from '@/hooks/useStudentAppointmentsByTeacher'

interface StudentAppointmentCardProps {
  appointment: StudentAppointmentDetails
  onConfirm?: (appointmentId: string) => void
  onCancel?: (appointmentId: string) => void
  onViewDetails?: (appointment: StudentAppointmentDetails) => void
}

export function StudentAppointmentCard({ 
  appointment, 
  onConfirm, 
  onCancel, 
  onViewDetails 
}: StudentAppointmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground'
      case 'pending': return 'bg-warning text-warning-foreground'
      case 'cancelled': return 'bg-destructive text-destructive-foreground'
      case 'completed': return 'bg-muted text-muted-foreground'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado'
      case 'pending': return 'Pendente'
      case 'cancelled': return 'Cancelado'
      case 'completed': return 'Concluído'
      case 'rescheduled': return 'Reagendado'
      default: return 'Agendado'
    }
  }

  const appointmentDate = new Date(appointment.scheduled_time)
  const isUpcoming = appointmentDate > new Date()

  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(appointmentDate, "dd 'de' MMMM", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(appointmentDate, 'HH:mm')}
                </div>
              </div>
              <Badge variant="secondary" className={getStatusColor(appointment.status)}>
                {getStatusText(appointment.status)}
              </Badge>
            </div>
            
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">
                  {appointment.student_title || appointment.title}
                </h3>
                {appointment.student_objectives && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Target className="h-3 w-3 inline mr-1" />
                    {appointment.student_objectives.substring(0, 100)}...
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Informações do Aluno */}
              {(appointment.student_title || appointment.student_objectives || appointment.student_notes) && (
                <div className="border-l-4 border-primary pl-4 bg-primary/5 rounded-r-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Informações do Aluno</span>
                  </div>
                  
                  {appointment.student_title && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Título:</span>
                      <p className="text-sm">{appointment.student_title}</p>
                    </div>
                  )}
                  
                  {appointment.student_objectives && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Objetivos:</span>
                      <p className="text-sm">{appointment.student_objectives}</p>
                    </div>
                  )}
                  
                  {appointment.student_notes && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Observações:</span>
                      <p className="text-sm">{appointment.student_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Informações do Agendamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Duração:</span>
                  <p className="text-sm">{appointment.duration} minutos</p>
                </div>
                
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
                  <p className="text-sm capitalize">{appointment.type}</p>
                </div>

                {appointment.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Local:</span>
                      <p className="text-sm">{appointment.location}</p>
                    </div>
                  </div>
                )}

                {appointment.meeting_link && (
                  <div className="flex items-start gap-2">
                    <Video className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Link:</span>
                      <p className="text-sm break-all">{appointment.meeting_link}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Descrição e Notas do Professor */}
              {(appointment.description || appointment.notes) && (
                <div>
                  {appointment.description && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Descrição:</span>
                      <p className="text-sm">{appointment.description}</p>
                    </div>
                  )}
                  
                  {appointment.notes && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Notas do Professor:</span>
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              {isUpcoming && appointment.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    onClick={() => onConfirm?.(appointment.id)}
                    className="flex-1"
                  >
                    Confirmar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onCancel?.(appointment.id)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {onViewDetails && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewDetails(appointment)}
                  className="w-full"
                >
                  Ver Detalhes Completos
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}