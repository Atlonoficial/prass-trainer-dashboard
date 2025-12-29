import { useState, useEffect, useMemo } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  User,
  MapPin,
  BookOpen
} from 'lucide-react'
import { useImprovedAvailableSlots, ImprovedAvailableSlot } from '@/hooks/useImprovedAvailableSlots'
import { useStudentTeacherAvailability } from '@/hooks/useStudentTeacherAvailability'
import { useAuth } from '@/hooks/useAuth'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StudentSchedulingCalendarProps {
  isOpen: boolean
  onClose: () => void
  teacherId?: string
}

export default function StudentSchedulingCalendar({ 
  isOpen, 
  onClose, 
  teacherId 
}: StudentSchedulingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<ImprovedAvailableSlot | null>(null)
  const [appointmentType, setAppointmentType] = useState('class')
  const [duration, setDuration] = useState(60)
  
  const { getAvailableSlots, bookAppointment, loading: bookingLoading } = useImprovedAvailableSlots()
  const { availability: teacherAvailability } = useStudentTeacherAvailability(teacherId)
  const { user } = useAuth()
  
  const [monthlySlots, setMonthlySlots] = useState<{[key: string]: ImprovedAvailableSlot[]}>({})
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Generate 3 months of data starting from current month
  const monthsToShow = useMemo(() => {
    const months = []
    for (let i = 0; i < 3; i++) {
      months.push(addMonths(new Date(), i))
    }
    return months
  }, [])

  // Fetch slots for the next 3 months
  useEffect(() => {
    const fetchMonthlySlots = async () => {
      if (!teacherId || teacherAvailability.length === 0) return
      
      setLoadingSlots(true)
      try {
        const slotsMap: {[key: string]: ImprovedAvailableSlot[]} = {}
        
        for (const month of monthsToShow) {
          const startDate = startOfMonth(month)
          const endDate = endOfMonth(month)
          const monthKey = format(month, 'yyyy-MM')
          
          const slots = await getAvailableSlots(teacherId, startDate, endDate, duration)
          slotsMap[monthKey] = slots
        }
        
        setMonthlySlots(slotsMap)
      } catch (error) {
        console.error('Error fetching monthly slots:', error)
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchMonthlySlots()
  }, [teacherId, teacherAvailability, duration])

  // Get available slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return []
    
    const monthKey = format(selectedDate, 'yyyy-MM')
    const monthSlots = monthlySlots[monthKey] || []
    
    return monthSlots.filter(slot => 
      isSameDay(parseISO(slot.slot_date), selectedDate)
    )
  }, [selectedDate, monthlySlots])

  // Get days with available slots for calendar display
  const daysWithSlots = useMemo(() => {
    const monthKey = format(currentMonth, 'yyyy-MM')
    const monthSlots = monthlySlots[monthKey] || []
    
    return monthSlots.map(slot => parseISO(slot.slot_date))
  }, [currentMonth, monthlySlots])

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(prev => subMonths(prev, 1))
    } else {
      setCurrentMonth(prev => addMonths(prev, 1))
    }
    setSelectedDate(undefined)
  }

  const handleBookAppointment = async () => {
    if (!selectedSlot || !teacherId) return
    
    try {
      await bookAppointment(
        teacherId,
        user?.id || '', // student_id
        selectedSlot.slot_start,
        appointmentType,
        duration,
        appointmentType === 'class' ? 'Aula Individual' : 'Avaliação Física'
      )
      
      // Refresh slots after booking
      setSelectedSlot(null)
      setSelectedDate(undefined)
      
      // Refetch slots for the affected month
      const monthKey = format(parseISO(selectedSlot.slot_date), 'yyyy-MM')
      const startDate = startOfMonth(parseISO(selectedSlot.slot_date))
      const endDate = endOfMonth(parseISO(selectedSlot.slot_date))
      
      const updatedSlots = await getAvailableSlots(teacherId, startDate, endDate, duration)
      setMonthlySlots(prev => ({
        ...prev,
        [monthKey]: updatedSlots
      }))
      
      onClose()
    } catch (error) {
      console.error('Error booking appointment:', error)
    }
  }

  const appointmentTypes = [
    { value: 'class', label: 'Aula Individual' },
    { value: 'assessment', label: 'Avaliação Física' },
    { value: 'consultation', label: 'Consultoria' }
  ]

  const durations = [
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' }
  ]

  if (!teacherId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
          </DialogHeader>
          <p>Professor não encontrado. Entre em contato com o suporte.</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Agendar Horário</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigateMonth('prev')}
                      disabled={format(currentMonth, 'yyyy-MM') <= format(new Date(), 'yyyy-MM')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigateMonth('next')}
                      disabled={format(currentMonth, 'yyyy-MM') >= format(addMonths(new Date(), 2), 'yyyy-MM')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date < today || !daysWithSlots.some(d => isSameDay(d, date))
                  }}
                  modifiers={{
                    available: daysWithSlots
                  }}
                  modifiersStyles={{
                    available: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'hsl(var(--primary-foreground))',
                      fontWeight: 'bold'
                    }
                  }}
                  className="rounded-md border"
                />
                
                {loadingSlots && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Carregando horários disponíveis...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Time Slots Section */}
          <div className="space-y-4">
            {/* Appointment Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Serviço</label>
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
                  <label className="text-sm font-medium mb-2 block">Duração</label>
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
              </CardContent>
            </Card>

            {/* Available Times */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Horários - {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateSlots.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Nenhum horário disponível nesta data
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant={selectedSlot === slot ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {format(parseISO(slot.slot_start), 'HH:mm')} - {format(parseISO(slot.slot_end), 'HH:mm')}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Booking Summary */}
            {selectedSlot && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumo do Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">
                        {format(parseISO(selectedSlot.slot_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Horário:</span>
                      <span className="font-medium">
                        {format(parseISO(selectedSlot.slot_start), 'HH:mm')} - {format(parseISO(selectedSlot.slot_end), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-medium">
                        {appointmentTypes.find(t => t.value === appointmentType)?.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duração:</span>
                      <span className="font-medium">
                        {durations.find(d => d.value === duration)?.label}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    className="w-full" 
                    onClick={handleBookAppointment}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Agendando...' : 'Confirmar Agendamento'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Dias com horários disponíveis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-muted"></div>
              <span className="text-muted-foreground">Dias indisponíveis</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}