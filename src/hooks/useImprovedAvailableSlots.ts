import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface ImprovedAvailableSlot {
  slot_date: string
  slot_start: string
  slot_end: string
}

export function useImprovedAvailableSlots() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const getAvailableSlots = useCallback(async (
    teacherId: string, 
    startDate: Date, 
    endDate: Date, 
    slotMinutes: number = 60
  ): Promise<ImprovedAvailableSlot[]> => {
    try {
      setLoading(true)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      
      if (!teacherId || teacherId.trim() === '') {
        return []
      }
      
      const { data, error } = await supabase.rpc('list_available_slots_improved', {
        p_teacher_id: teacherId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
        p_slot_minutes: slotMinutes
      })

      if (error) {
        if (error.message?.includes('RLS') || error.message?.includes('policy')) {
          toast({ 
            title: 'Erro de Permissão', 
            description: 'Sem permissão para acessar horários.', 
            variant: 'destructive' 
          })
        } else {
          toast({ 
            title: 'Erro', 
            description: 'Erro ao buscar horários disponíveis', 
            variant: 'destructive' 
          })
        }
        throw error
      }

      return (data || []).map((slot: any) => ({
        slot_date: slot.slot_date,
        slot_start: slot.slot_start,
        slot_end: slot.slot_end
      }))
    } catch (error) {
      if (!error?.message?.includes('RLS') && !error?.message?.includes('policy')) {
        toast({ 
          title: 'Erro', 
          description: 'Não foi possível carregar os horários disponíveis', 
          variant: 'destructive' 
        })
      }
      return []
    } finally {
      setLoading(false)
    }
  }, [toast, user?.id])

  const bookAppointment = useCallback(async (
    teacherId: string,
    studentId: string,
    scheduledTime: string,
    type: string = 'class',
    duration: number = 60,
    title?: string,
    description?: string,
    studentTitle?: string,
    studentObjectives?: string,
    studentNotes?: string,
    isManualCreation: boolean = false
  ) => {
    try {
      setLoading(true)
      
      // Usar nova versão da função com parâmetro is_manual_creation
      const { data, error } = await supabase.rpc('book_appointment', {
        p_teacher_id: teacherId,
        p_scheduled_time: scheduledTime,
        p_type: type,
        p_duration: duration,
        p_title: title,
        p_description: description,
        p_student_title: studentTitle,
        p_student_objectives: studentObjectives,
        p_student_notes: studentNotes,
        p_is_manual_creation: isManualCreation
      })

      if (error) {
        console.error('Error booking appointment:', error)
        
        // Melhorar tratamento de erros específicos
        let errorMessage = 'Não foi possível realizar o agendamento'
        if (error.message?.includes('not available')) {
          errorMessage = 'Horário não está mais disponível. Tente outro horário.'
        } else if (error.message?.includes('minimum advance')) {
          errorMessage = 'Agendamento muito próximo do horário atual. Selecione um horário mais tarde.'
        } else if (error.message?.includes('same day')) {
          errorMessage = 'Agendamentos no mesmo dia não são permitidos.'
        }
        
        toast({ 
          title: 'Erro', 
          description: errorMessage, 
          variant: 'destructive' 
        })
        throw error
      }

      toast({ 
        title: 'Sucesso', 
        description: 'Agendamento realizado com sucesso!' 
      })

      return data
    } catch (error) {
      console.error('Error in bookAppointment:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [toast])

  return {
    getAvailableSlots,
    bookAppointment,
    loading
  }
}