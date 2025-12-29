import React, { useState, useEffect, useMemo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Clock, Calendar as CalendarIcon, Info, CheckCircle, AlertTriangle, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useImprovedAvailableSlots } from '@/hooks/useImprovedAvailableSlots'
import { useTimeSlotFiltering } from '@/hooks/useTimeSlotFiltering'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TeacherSchedulingInterfaceProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  onAppointmentCreated?: () => void
}

export function TeacherSchedulingInterface({ 
  isOpen,
  onClose,
  studentId,
  studentName,
  onAppointmentCreated
}: TeacherSchedulingInterfaceProps) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedSlot, setSelectedSlot] = useState<string>()
  const [appointmentType, setAppointmentType] = useState('class')
  const [duration, setDuration] = useState(60)
  const [appointmentTitle, setAppointmentTitle] = useState('')
  const [appointmentDescription, setAppointmentDescription] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  const { 
    getAvailableSlots, 
    bookAppointment, 
    loading: slotsLoading 
  } = useImprovedAvailableSlots()

  const { isSlotAvailable } = useTimeSlotFiltering(selectedDate)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])

  // Buscar slots disponíveis quando data for selecionada
  useEffect(() => {
    if (selectedDate && user?.id) {
      const fetchSlots = async () => {
        const startDate = startOfDay(selectedDate)
        const endDate = startOfDay(selectedDate)
        const slots = await getAvailableSlots(user.id, startDate, endDate, duration)
        
        // Filtrar horários que já passaram se for hoje
        const filteredSlots = slots.filter(slot => isSlotAvailable(slot.slot_start))
        setAvailableSlots(filteredSlots)
      }
      fetchSlots()
    } else {
      setAvailableSlots([])
    }
  }, [selectedDate, user?.id, duration, isSlotAvailable])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(undefined)
      setSelectedSlot(undefined)
      setAppointmentTitle('')
      setAppointmentDescription('')
      setAppointmentType('class')
      setDuration(60)
    }
  }, [isOpen])

  const handleBooking = async () => {
    if (!selectedSlot || !appointmentTitle.trim() || !user?.id) {
      return
    }

    try {
      setBookingLoading(true)
      
      // Map frontend types to backend types
      const backendType = appointmentType === 'class' ? 'class' : 
                          appointmentType === 'assessment' ? 'assessment' : 
                          appointmentType === 'consultation' ? 'consultation' : 
                          appointmentType === 'follow_up' ? 'follow_up' : 'class'

      await bookAppointment(
        user.id, // teacherId
        studentId, // studentId
        selectedSlot,
        backendType,
        duration,
        appointmentTitle,
        appointmentDescription,
        appointmentTitle, // studentTitle
        '', // studentObjectives
        '', // studentNotes
        true // isManualCreation - Professor criando agendamento
      )

      // Reset form
      setSelectedDate(undefined)
      setSelectedSlot(undefined)
      setAppointmentTitle('')
      setAppointmentDescription('')
      
      onAppointmentCreated?.()
      onClose()
    } catch (error) {
      console.error('Error booking appointment:', error)
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

  // Filtrar datas disponíveis (próximos 30 dias)
  const availableDatesMatcher = useMemo(() => {
    return (date: Date) => {
      const now = new Date()
      const daysDiff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 0 && daysDiff <= 30
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Agendar Consulta - {studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configurações e Informações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Configurações do Agendamento
              </CardTitle>
              <CardDescription>
                Configure os detalhes da consulta com o aluno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações do Aluno */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Aluno Selecionado</span>
                </div>
                <p className="text-sm text-muted-foreground">{studentName}</p>
              </div>

              <Separator />

              {/* Tipo de Consulta */}
              <div>
                <Label htmlFor="appointment-type">Tipo de Consulta</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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

              {/* Duração */}
              <div>
                <Label htmlFor="duration">Duração</Label>
                <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a duração" />
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
                <Label htmlFor="title">Título da Consulta *</Label>
                <Input
                  id="title"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="Ex: Avaliação física inicial"
                />
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={appointmentDescription}
                  onChange={(e) => setAppointmentDescription(e.target.value)}
                  placeholder="Observações sobre a consulta..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendário e Horários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Selecionar Data e Horário
              </CardTitle>
              <CardDescription>
                Escolha uma data e horário disponível
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Calendário */}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => !availableDatesMatcher?.(date)}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>

              {/* Horários Disponíveis */}
              {selectedDate && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horários para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h4>
                  
                  {slotsLoading ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => {
                        const slotTime = new Date(slot.slot_start)
                        const timeString = format(slotTime, 'HH:mm')
                        
                        return (
                          <Button
                            key={slot.slot_start}
                            variant={selectedSlot === slot.slot_start ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedSlot(slot.slot_start)}
                            className="text-xs"
                          >
                            {timeString}
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Não há horários disponíveis para esta data
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Botão de Confirmação */}
              {selectedSlot && appointmentTitle.trim() && (
                <div className="pt-4 border-t">
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Agendamento</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Aluno:</strong> {studentName}</p>
                      <p><strong>Data:</strong> {format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                      <p><strong>Horário:</strong> {format(new Date(selectedSlot), 'HH:mm')}</p>
                      <p><strong>Tipo:</strong> {appointmentTypes.find(t => t.value === appointmentType)?.label}</p>
                      <p><strong>Duração:</strong> {durations.find(d => d.value === duration)?.label}</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full"
                  >
                    {bookingLoading ? (
                      <>
                        <LoadingSpinner />
                        Agendando...
                      </>
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}