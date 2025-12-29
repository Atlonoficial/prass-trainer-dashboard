import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  X,
  CalendarDays,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useImprovedAvailableSlots } from '@/hooks/useImprovedAvailableSlots'
import { format, addDays, startOfDay, isAfter, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TeacherPeriodSchedulingInterfaceProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  onAppointmentsCreated?: () => void
}

interface WeeklySchedule {
  weekday: number
  time: string
  enabled: boolean
}

export function TeacherPeriodSchedulingInterface({ 
  isOpen,
  onClose,
  studentId,
  studentName,
  onAppointmentsCreated
}: TeacherPeriodSchedulingInterfaceProps) {
  const { user } = useAuth()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [appointmentType, setAppointmentType] = useState('class')
  const [duration, setDuration] = useState(60)
  const [appointmentTitle, setAppointmentTitle] = useState('')
  const [appointmentDescription, setAppointmentDescription] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [previewAppointments, setPreviewAppointments] = useState<any[]>([])

  const { bookAppointment, getAvailableSlots } = useImprovedAvailableSlots()

  // Horários padrão para cada dia da semana
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule[]>([
    { weekday: 1, time: '09:00', enabled: false }, // Segunda
    { weekday: 2, time: '09:00', enabled: false }, // Terça
    { weekday: 3, time: '09:00', enabled: false }, // Quarta
    { weekday: 4, time: '09:00', enabled: false }, // Quinta
    { weekday: 5, time: '09:00', enabled: false }, // Sexta
    { weekday: 6, time: '09:00', enabled: false }, // Sábado
    { weekday: 0, time: '09:00', enabled: false }, // Domingo
  ])

  const weekdays = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ]

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate(undefined)
      setEndDate(undefined)
      setAppointmentTitle('')
      setAppointmentDescription('')
      setAppointmentType('class')
      setDuration(60)
      setPreviewAppointments([])
      setWeeklySchedule(prev => prev.map(s => ({ ...s, enabled: false })))
    }
  }, [isOpen])

  // Gerar preview dos agendamentos
  useEffect(() => {
    if (startDate && endDate && weeklySchedule.some(s => s.enabled)) {
      generatePreviewAppointments()
    } else {
      setPreviewAppointments([])
    }
  }, [startDate, endDate, weeklySchedule])

  const generatePreviewAppointments = () => {
    if (!startDate || !endDate) return

    const appointments = []
    const current = new Date(startDate)
    
    while (isBefore(current, endDate) || current.toDateString() === endDate.toDateString()) {
      const weekday = current.getDay()
      const schedule = weeklySchedule.find(s => s.weekday === weekday && s.enabled)
      
      if (schedule) {
        const [hours, minutes] = schedule.time.split(':')
        const appointmentDate = new Date(current)
        appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        
        appointments.push({
          date: new Date(appointmentDate),
          weekday: weekdays[weekday],
          time: schedule.time
        })
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    setPreviewAppointments(appointments)
  }

  const updateWeeklySchedule = (weekday: number, field: keyof Omit<WeeklySchedule, 'weekday'>, value: any) => {
    setWeeklySchedule(prev => 
      prev.map(s => 
        s.weekday === weekday 
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  const handleCreateAppointments = async () => {
    if (!appointmentTitle.trim() || !user?.id || previewAppointments.length === 0) {
      return
    }

    try {
      setBookingLoading(true)
      
      // Criar cada agendamento individualmente
      for (const appointment of previewAppointments) {
        const appointmentDateTime = appointment.date.toISOString()
        
        await bookAppointment(
          user.id, // teacherId
          studentId, // studentId
          appointmentDateTime,
          appointmentType,
          duration,
          appointmentTitle,
          appointmentDescription,
          appointmentTitle, // studentTitle
          '', // studentObjectives
          '' // studentNotes
        )
      }

      // Reset form
      setStartDate(undefined)
      setEndDate(undefined)
      setAppointmentTitle('')
      setAppointmentDescription('')
      setPreviewAppointments([])
      
      onAppointmentsCreated?.()
      onClose()
    } catch (error) {
      console.error('Error creating appointments:', error)
    } finally {
      setBookingLoading(false)
    }
  }

  const appointmentTypes = [
    { value: 'class', label: 'Aula Individual' },
    { value: 'assessment', label: 'Avaliação Física' },
    { value: 'consultation', label: 'Consultoria' },
    { value: 'follow_up', label: 'Acompanhamento' }
  ]

  const durations = [
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' }
  ]

  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Agendar Período - {studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações do Aluno */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-sm">Aluno</span>
                </div>
                <p className="text-sm text-muted-foreground">{studentName}</p>
              </div>

              {/* Tipo e Duração */}
              <div>
                <Label className="text-sm">Tipo de Consulta</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Duração</Label>
                <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map(dur => (
                      <SelectItem key={dur.value} value={dur.value.toString()}>
                        {dur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Título */}
              <div>
                <Label className="text-sm">Título *</Label>
                <Input
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="Ex: Treino semanal"
                />
              </div>

              {/* Descrição */}
              <div>
                <Label className="text-sm">Descrição</Label>
                <Textarea
                  value={appointmentDescription}
                  onChange={(e) => setAppointmentDescription(e.target.value)}
                  placeholder="Observações..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Período e Horários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Período e Horários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Datas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Data Início</Label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => isBefore(date, new Date())}
                    className="rounded-md border w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm">Data Fim</Label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => !startDate || isBefore(date, startDate)}
                    className="rounded-md border w-full"
                  />
                </div>
              </div>

              {/* Horários por dia da semana */}
              <div>
                <Label className="text-sm mb-2 block">Horários por Dia da Semana</Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {weeklySchedule.map((schedule) => (
                      <div key={schedule.weekday} className="flex items-center gap-2 p-2 border rounded">
                        <Checkbox
                          checked={schedule.enabled}
                          onCheckedChange={(checked) => 
                            updateWeeklySchedule(schedule.weekday, 'enabled', checked)
                          }
                        />
                        <span className="text-sm font-medium w-16">
                          {weekdays[schedule.weekday].slice(0, 3)}
                        </span>
                        <Select 
                          value={schedule.time} 
                          onValueChange={(value) => 
                            updateWeeklySchedule(schedule.weekday, 'time', value)
                          }
                          disabled={!schedule.enabled}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Preview dos Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview dos Agendamentos</CardTitle>
              <CardDescription className="text-xs">
                {previewAppointments.length} agendamento(s) serão criados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewAppointments.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {previewAppointments.slice(0, 20).map((appointment, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {format(appointment.date, 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {appointment.weekday}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {appointment.time} - {durations.find(d => d.value === duration)?.label}
                        </div>
                      </div>
                    ))}
                    {previewAppointments.length > 20 && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        ... e mais {previewAppointments.length - 20} agendamentos
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Configure as datas e horários para ver o preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateAppointments}
            disabled={!appointmentTitle.trim() || previewAppointments.length === 0 || bookingLoading}
          >
            {bookingLoading ? (
              <>
                <LoadingSpinner />
                Criando {previewAppointments.length} agendamentos...
              </>
            ) : (
              `Criar ${previewAppointments.length} Agendamento(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}