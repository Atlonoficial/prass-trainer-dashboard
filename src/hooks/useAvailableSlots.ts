import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface AvailableSlot {
  slot_start: string
  slot_end: string
}

export function useAvailableSlots() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const getAvailableSlots = async (
    teacherId: string, 
    date: Date, 
    slotMinutes: number = 60
  ): Promise<AvailableSlot[]> => {
    if (!user?.id) return []
    
    try {
      setLoading(true)
      
      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0]
      
      const { data, error } = await supabase.rpc('list_available_slots', {
        p_teacher_id: teacherId,
        p_date: dateStr,
        p_slot_minutes: slotMinutes
      })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching available slots:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar os horários disponíveis', 
        variant: 'destructive' 
      })
      return []
    } finally {
      setLoading(false)
    }
  }

  const bookAppointment = async (
    teacherId: string,
    scheduledTime: string,
    type: string = 'class',
    duration: number = 60,
    title?: string,
    description?: string
  ) => {
    if (!user?.id) return null

    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('book_appointment', {
        p_teacher_id: teacherId,
        p_scheduled_time: scheduledTime,
        p_type: type,
        p_duration: duration,
        p_title: title,
        p_description: description
      })

      if (error) throw error

      toast({ 
        title: 'Agendamento Confirmado', 
        description: `Agendamento marcado para ${new Date(scheduledTime).toLocaleString()}` 
      })
      
      return data
    } catch (error) {
      console.error('Error booking appointment:', error)
      const errorMessage = error.message || 'Não foi possível criar o agendamento'
      toast({ 
        title: 'Erro no Agendamento', 
        description: errorMessage, 
        variant: 'destructive' 
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { 
    getAvailableSlots, 
    bookAppointment, 
    loading 
  }
}