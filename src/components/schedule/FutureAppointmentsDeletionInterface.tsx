import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { 
  Calendar as CalendarIcon, 
  Trash2, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { useAppointments } from '@/hooks/useAppointments'
import { useAuth } from '@/hooks/useAuth'
import { format, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FutureAppointmentsDeletionInterfaceProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  onAppointmentsDeleted?: () => void
}

export function FutureAppointmentsDeletionInterface({ 
  isOpen,
  onClose,
  studentId,
  studentName,
  onAppointmentsDeleted
}: FutureAppointmentsDeletionInterfaceProps) {
  const { user } = useAuth()
  const { appointments, loading, deleteAppointment, deleteFutureAppointments } = useAppointments()
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([])
  const [deletionMode, setDeletionMode] = useState<'selected' | 'all_future'>('selected')
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Filtrar apenas agendamentos futuros do aluno específico
  const futureAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.scheduled_time)
    const now = new Date()
    
    return (
      appointment.student_id === studentId &&
      appointment.teacher_id === user?.id &&
      isAfter(appointmentDate, now) &&
      appointment.status !== 'cancelled'
    )
  }).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())

  // Reset quando modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedAppointments([])
      setDeletionMode('selected')
      setConfirmDelete(false)
    }
  }, [isOpen])

  const handleSelectAppointment = (appointmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, appointmentId])
    } else {
      setSelectedAppointments(prev => prev.filter(id => id !== appointmentId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(futureAppointments.map(a => a.id))
    } else {
      setSelectedAppointments([])
    }
  }

  const handleDeleteAppointments = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    try {
      setDeletingLoading(true)

      if (deletionMode === 'all_future') {
        // Deletar todos os agendamentos futuros do aluno
        await deleteFutureAppointments(studentId)
      } else {
        // Deletar apenas os selecionados
        for (const appointmentId of selectedAppointments) {
          await deleteAppointment(appointmentId)
        }
      }

      setSelectedAppointments([])
      setConfirmDelete(false)
      onAppointmentsDeleted?.()
      onClose()
    } catch (error) {
      console.error('Error deleting appointments:', error)
    } finally {
      setDeletingLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado'
      case 'confirmed':
        return 'Confirmado'
      case 'rescheduled':
        return 'Reagendado'
      default:
        return status
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Deletar Agendamentos Futuros - {studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Aluno */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Aluno Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="font-medium">{studentName}</span>
                <Badge variant="outline">
                  {futureAppointments.length} agendamento(s) futuro(s)
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Modo de Exclusão */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Modo de Exclusão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selected"
                  checked={deletionMode === 'selected'}
                  onCheckedChange={() => setDeletionMode('selected')}
                />
                <label htmlFor="selected" className="text-sm">
                  Deletar apenas os agendamentos selecionados
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all_future"
                  checked={deletionMode === 'all_future'}
                  onCheckedChange={() => setDeletionMode('all_future')}
                />
                <label htmlFor="all_future" className="text-sm">
                  Deletar TODOS os agendamentos futuros do aluno
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Agendamentos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Agendamentos Futuros ({futureAppointments.length})
                </CardTitle>
                {deletionMode === 'selected' && futureAppointments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedAppointments.length === futureAppointments.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">Selecionar todos</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : futureAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>Nenhum agendamento futuro encontrado para este aluno</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {futureAppointments.map((appointment) => {
                      const isSelected = selectedAppointments.includes(appointment.id)
                      const willBeDeleted = deletionMode === 'all_future' || isSelected
                      
                      return (
                        <div 
                          key={appointment.id} 
                          className={`p-3 border rounded-lg transition-colors ${
                            willBeDeleted 
                              ? 'border-destructive bg-destructive/5' 
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {deletionMode === 'selected' && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleSelectAppointment(appointment.id, checked as boolean)
                                }
                                className="mt-1"
                              />
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{appointment.title}</h4>
                                <Badge className={getStatusColor(appointment.status)}>
                                  {getStatusLabel(appointment.status)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(appointment.scheduled_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(appointment.scheduled_time), 'HH:mm')}
                                </div>
                                {appointment.duration && (
                                  <span>{appointment.duration} min</span>
                                )}
                              </div>
                              
                              {appointment.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {appointment.description}
                                </p>
                              )}
                            </div>
                            
                            {willBeDeleted && (
                              <div className="flex items-center gap-1 text-destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs">Será deletado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Confirmação */}
          {confirmDelete && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção!</strong> Esta ação não pode ser desfeita. 
                {deletionMode === 'all_future' 
                  ? ` Todos os ${futureAppointments.length} agendamentos futuros serão deletados.`
                  : ` ${selectedAppointments.length} agendamento(s) selecionado(s) será(ão) deletado(s).`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          
          {!confirmDelete ? (
            <Button 
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={
                futureAppointments.length === 0 || 
                (deletionMode === 'selected' && selectedAppointments.length === 0)
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletionMode === 'all_future' 
                ? `Deletar Todos (${futureAppointments.length})`
                : `Deletar Selecionados (${selectedAppointments.length})`
              }
            </Button>
          ) : (
            <Button 
              variant="destructive"
              onClick={handleDeleteAppointments}
              disabled={deletingLoading}
            >
              {deletingLoading ? (
                <>
                  <LoadingSpinner />
                  Deletando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}