import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface BookingSettings {
  minimum_advance_minutes: number
  visibility_days: number
  allow_same_day: boolean
}

export interface TeacherAvailability {
  id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
}

export function useStudentBookingSettings(teacherId?: string) {
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [availability, setAvailability] = useState<TeacherAvailability[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchBookingSettings = async (id: string) => {
    try {
      setLoading(true)

      // Buscar configurações de agendamento
      const { data: settingsData, error: settingsError } = await supabase
        .from('teacher_booking_settings')
        .select('minimum_advance_minutes, visibility_days, allow_same_day')
        .eq('teacher_id', id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      // Usar configurações padrão se não existir
      const bookingSettings = settingsData || {
        minimum_advance_minutes: 120, // 2 horas
        visibility_days: 7,
        allow_same_day: false
      }

      setSettings(bookingSettings)

      // Buscar disponibilidade do professor
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('teacher_availability')
        .select('id, weekday, start_time, end_time, slot_minutes')
        .eq('teacher_id', id)
        .order('weekday')

      if (availabilityError) {
        throw availabilityError
      }

      setAvailability(availabilityData || [])
    } catch (error) {
      console.error('Error fetching booking settings:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de agendamento',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teacherId) {
      fetchBookingSettings(teacherId)
    }
  }, [teacherId])

  // Função para formatar tempo de antecedência
  const formatAdvanceTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutos`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} horas`
    return `${Math.floor(minutes / 1440)} dias`
  }

  // Função para verificar se pode agendar em determinado horário
  const canBookAt = (targetTime: Date): { canBook: boolean; reason?: string } => {
    if (!settings) return { canBook: false, reason: 'Configurações não carregadas' }

    const now = new Date()
    const targetDate = new Date(targetTime)
    const diffMinutes = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60))

    // Verificar antecedência mínima
    if (diffMinutes < settings.minimum_advance_minutes) {
      return { 
        canBook: false, 
        reason: `Necessário agendar com pelo menos ${formatAdvanceTime(settings.minimum_advance_minutes)} de antecedência` 
      }
    }

    // Verificar se é mesmo dia (se não permitido)
    if (!settings.allow_same_day && targetDate.toDateString() === now.toDateString()) {
      return { 
        canBook: false, 
        reason: 'Agendamentos no mesmo dia não são permitidos' 
      }
    }

    // Verificar janela de visibilidade
    const maxDays = settings.visibility_days
    const daysDiff = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > maxDays) {
      return { 
        canBook: false, 
        reason: `Só é possível agendar até ${maxDays} dias de antecedência` 
      }
    }

    return { canBook: true }
  }

  // Função para obter regras de agendamento formatadas
  const getBookingRules = (): string[] => {
    if (!settings) return []

    const rules = []
    
    rules.push(`Antecedência mínima: ${formatAdvanceTime(settings.minimum_advance_minutes)}`)
    rules.push(`Agendamento até: ${settings.visibility_days} dias`)
    
    if (settings.allow_same_day) {
      rules.push('Agendamentos no mesmo dia são permitidos')
    } else {
      rules.push('Agendamentos no mesmo dia não são permitidos')
    }

    return rules
  }

  // Função para obter dias da semana com disponibilidade
  const getAvailableDays = (): string[] => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const availableDays: string[] = []

    availability.forEach(av => {
      if (!availableDays.includes(days[av.weekday])) {
        availableDays.push(days[av.weekday])
      }
    })

    return availableDays
  }

  return {
    settings,
    availability,
    loading,
    formatAdvanceTime,
    canBookAt,
    getBookingRules,
    getAvailableDays,
    refetch: () => teacherId && fetchBookingSettings(teacherId)
  }
}