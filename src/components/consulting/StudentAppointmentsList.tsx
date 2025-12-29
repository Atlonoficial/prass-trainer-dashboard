import { useStudentAppointmentsByTeacher } from '@/hooks/useStudentAppointmentsByTeacher'
import { StudentAppointmentCard } from './StudentAppointmentCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Calendar, Clock, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface StudentAppointmentsListProps {
  studentId?: string
  teacherId?: string
  onConfirmAppointment?: (appointmentId: string) => void
  onCancelAppointment?: (appointmentId: string) => void
}

export function StudentAppointmentsList({
  studentId,
  teacherId,
  onConfirmAppointment,
  onCancelAppointment
}: StudentAppointmentsListProps) {
  const [showFullHistory, setShowFullHistory] = useState(false)
  
  const { appointments, loading, updateAppointmentStatus } = useStudentAppointmentsByTeacher(
    studentId,
    teacherId,
    {
      historyLimit: 10,
      pastDaysLimit: 30,
      showFullHistory
    }
  )

  const handleConfirm = async (appointmentId: string) => {
    try {
      await updateAppointmentStatus(appointmentId, 'confirmed')
      onConfirmAppointment?.(appointmentId)
    } catch (error) {
      console.error('Error confirming appointment:', error)
    }
  }

  const handleCancel = (appointmentId: string) => {
    onCancelAppointment?.(appointmentId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!appointments.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Nenhum agendamento encontrado</h3>
        <p>Este aluno ainda não possui agendamentos.</p>
      </div>
    )
  }

  // Separar agendamentos por status e data
  const now = new Date()
  const upcomingAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.scheduled_time)
    return appointmentDate > now && apt.status !== 'cancelled'
  })
  
  let pastAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.scheduled_time)
    return appointmentDate <= now || apt.status === 'cancelled'
  })

  // Se não está mostrando histórico completo, limitar a 10 itens mais recentes
  if (!showFullHistory) {
    pastAppointments = pastAppointments.slice(0, 10)
  }

  const pendingAppointments = upcomingAppointments.filter(apt => apt.status === 'pending')
  const confirmedAppointments = upcomingAppointments.filter(apt => apt.status === 'confirmed')
  
  // Verificar se há mais histórico disponível
  const totalPastAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.scheduled_time)
    return appointmentDate <= now || apt.status === 'cancelled'
  }).length
  
  const hasMoreHistory = !showFullHistory && totalPastAppointments > 10

  return (
    <div className="space-y-6">
      {/* Agendamentos Pendentes */}
      {pendingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="h-5 w-5" />
              Pendentes de Confirmação ({pendingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingAppointments.map((appointment) => (
                <StudentAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agendamentos Confirmados */}
      {confirmedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Calendar className="h-5 w-5" />
              Confirmados ({confirmedAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confirmedAppointments.map((appointment) => (
                <StudentAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      {pastAppointments.length > 0 && (
        <>
          {(pendingAppointments.length > 0 || confirmedAppointments.length > 0) && (
            <Separator className="my-6" />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  Histórico ({pastAppointments.length}{!showFullHistory && hasMoreHistory ? '+' : ''})
                </div>
                {hasMoreHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullHistory(true)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver histórico completo
                  </Button>
                )}
                {showFullHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullHistory(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Mostrar apenas recentes
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastAppointments.map((appointment) => (
                  <StudentAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
              {!showFullHistory && pastAppointments.length === 10 && (
                <div className="text-center pt-4 text-muted-foreground text-sm">
                  Mostrando os 10 agendamentos mais recentes dos últimos 30 dias
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}