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
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Clock, Calendar as CalendarIcon, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { useStudentBookingSettings } from '@/hooks/useStudentBookingSettings'
import { useImprovedAvailableSlots } from '@/hooks/useImprovedAvailableSlots'
import { useTimeSlotFiltering } from '@/hooks/useTimeSlotFiltering'
import { useAuth } from '@/hooks/useAuth'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StudentSchedulingInterfaceProps {
  teacherId: string
  onAppointmentBooked?: (appointmentId: string) => void
}

export function StudentSchedulingInterface({ 
  teacherId, 
  onAppointmentBooked 
}: StudentSchedulingInterfaceProps) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedSlot, setSelectedSlot] = useState<string>()
  const [appointmentTitle, setAppointmentTitle] = useState('')
  const [appointmentObjectives, setAppointmentObjectives] = useState('')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  const { 
    settings, 
    availability, 
    loading: settingsLoading, 
    canBookAt, 
    getBookingRules, 
    getAvailableDays 
  } = useStudentBookingSettings(teacherId)

  const { 
    getAvailableSlots, 
    bookAppointment, 
    loading: slotsLoading 
  } = useImprovedAvailableSlots()

  const { isSlotAvailable } = useTimeSlotFiltering(selectedDate)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])

  // Buscar slots disponíveis quando data for selecionada
  useEffect(() => {
    if (selectedDate && teacherId) {
      const fetchSlots = async () => {
        const startDate = startOfDay(selectedDate)
        const endDate = startOfDay(selectedDate)
        const slots = await getAvailableSlots(teacherId, startDate, endDate, 60)
        
        // Filtrar horários que já passaram se for hoje
        const filteredSlots = slots.filter(slot => isSlotAvailable(slot.slot_start))
        setAvailableSlots(filteredSlots)
      }
      fetchSlots()
    } else {
      setAvailableSlots([])
    }
  }, [selectedDate, teacherId, isSlotAvailable])

  // Filtrar datas disponíveis para o calendário
  const availableDatesMatcher = useMemo(() => {
    if (!settings || !availability.length) return undefined

    return (date: Date) => {
      const weekday = date.getDay()
      const hasAvailability = availability.some(av => av.weekday === weekday)
      
      if (!hasAvailability) return false

      // Verificar se está dentro da janela de visibilidade
      const now = new Date()
      const daysDiff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff < 0 || daysDiff > settings.visibility_days) return false

      // Verificar se é mesmo dia (se não permitido)
      if (!settings.allow_same_day && date.toDateString() === now.toDateString()) {
        return false
      }

      return true
    }
  }, [settings, availability])

  const handleBooking = async () => {
    if (!selectedSlot || !appointmentTitle.trim()) {
      return
    }

    try {
      setBookingLoading(true)
      
      const appointmentId = await bookAppointment(
        teacherId,
        user?.id || '', // student_id
        selectedSlot,
        'class', // Student bookings default to 'class'
        60,
        appointmentTitle,
        '',
        appointmentTitle,
        appointmentObjectives,
        appointmentNotes,
        false // isManualCreation - Aluno criando agendamento
      )

      // Reset form
      setSelectedDate(undefined)
      setSelectedSlot(undefined)
      setAppointmentTitle('')
      setAppointmentObjectives('')
      setAppointmentNotes('')
      
      onAppointmentBooked?.(appointmentId)
    } catch (error) {
      console.error('Error booking appointment:', error)
    } finally {
      setBookingLoading(false)
    }
  }

  if (settingsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (!settings || !availability.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Professor ainda não configurou horários de disponibilidade
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Informações e Regras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Regras de Agendamento
          </CardTitle>
          <CardDescription>
            Informações sobre horários e políticas de agendamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Regras de Agendamento */}
          <div>
            <h4 className="font-medium mb-2">Políticas de Agendamento</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getBookingRules().map((rule, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Dias Disponíveis */}
          <div>
            <h4 className="font-medium mb-2">Dias Disponíveis</h4>
            <div className="flex flex-wrap gap-1">
              {getAvailableDays().map((day) => (
                <Badge key={day} variant="secondary" className="text-xs">
                  {day}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Horários por Dia */}
          <div>
            <h4 className="font-medium mb-2">Horários de Atendimento</h4>
            <ScrollArea className="h-32">
              <div className="space-y-2 text-sm">
                {availability.map((av) => {
                  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                  return (
                    <div key={av.id} className="flex justify-between items-center">
                      <span className="font-medium">{days[av.weekday]}</span>
                      <span className="text-muted-foreground">
                        {av.start_time} - {av.end_time}
                      </span>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Calendário e Agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Agendar Consulta
          </CardTitle>
          <CardDescription>
            Selecione uma data e horário disponível
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
                    const validation = canBookAt(slotTime)
                    
                    return (
                      <Button
                        key={slot.slot_start}
                        variant={selectedSlot === slot.slot_start ? 'default' : 'outline'}
                        size="sm"
                        disabled={!validation.canBook}
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

          {/* Formulário de Agendamento */}
          {selectedSlot && (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label htmlFor="title">Título da Consulta *</Label>
                <Input
                  id="title"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="Ex: Consulta de acompanhamento"
                />
              </div>

              <div>
                <Label htmlFor="objectives">Objetivos da Consulta</Label>
                <Textarea
                  id="objectives"
                  value={appointmentObjectives}
                  onChange={(e) => setAppointmentObjectives(e.target.value)}
                  placeholder="O que você gostaria de trabalhar nesta consulta?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações Adicionais</Label>
                <Textarea
                  id="notes"
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Alguma informação adicional importante?"
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleBooking}
                disabled={!appointmentTitle.trim() || bookingLoading}
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
  )
}