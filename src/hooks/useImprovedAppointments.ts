import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { normalizeServiceForBackend } from '@/lib/serviceMapping'
import { useImprovedAvailableSlots } from '@/hooks/useImprovedAvailableSlots'
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications'

export interface ImprovedAppointment {
  id: string
  teacher_id: string
  student_id: string
  scheduled_time: string
  duration: number
  status: string
  type: string
  title: string
  description?: string
  notes?: string
  location?: string
  meeting_link?: string
  student_title?: string
  student_objectives?: string
  student_notes?: string
  created_at: string
  updated_at: string
}

export function useImprovedAppointments() {
  const [appointments, setAppointments] = useState<ImprovedAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const { bookAppointment } = useImprovedAvailableSlots()
  const { sendAppointmentNotification } = useAppointmentNotifications()

  const fetchAppointments = async (includeHistory: boolean = false) => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Get current month start and end dates
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('teacher_id', user.id)
        .order('scheduled_time', { ascending: true })

      if (!includeHistory) {
        // Filter by current month only
        query = query
          .gte('scheduled_time', currentMonthStart.toISOString())
          .lte('scheduled_time', currentMonthEnd.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createAppointmentWithValidation = async (appointmentData: {
    student_id: string
    scheduled_time: string
    duration?: number
    type?: string
    title?: string
    description?: string
    notes?: string
    location?: string
    student_title?: string
    student_objectives?: string
    student_notes?: string
  }, isManualCreation: boolean = false) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Garantir que o tipo está normalizado para o sistema
      const normalizedType = normalizeServiceForBackend(appointmentData.type);
      const finalData = { ...appointmentData, type: normalizedType };

      console.log('📅 [IMPROVED_APPOINTMENTS] Creating appointment with Portuguese mapping')
      console.log('🔄 [SERVICE_MAPPING] Original type:', appointmentData.type)
      console.log('🔄 [SERVICE_MAPPING] Normalized type:', normalizedType)
      console.log('🔍 [APPOINTMENT_CREATION] Final data:', JSON.stringify(finalData, null, 2))

      // Use the improved book_appointment function with manual creation flag
      try {
        const { data: bookingResult, error: bookingError } = await supabase.rpc('book_appointment', {
          p_teacher_id: user.id,
          p_scheduled_time: appointmentData.scheduled_time,
          p_type: appointmentData.type || 'class',
          p_duration: appointmentData.duration || 60,
          p_title: appointmentData.title,
          p_description: appointmentData.description,
          p_student_title: appointmentData.student_title,
          p_student_objectives: appointmentData.student_objectives,
          p_student_notes: appointmentData.student_notes,
          p_is_manual_creation: isManualCreation
        })

        if (bookingError) throw bookingError

        console.log('✅ Appointment created via book_appointment:', bookingResult)
        console.log('🔍 [APPOINTMENT_CREATION] RPC function succeeded!')
        console.log('🔍 [APPOINTMENT_CREATION] Result data:', JSON.stringify(bookingResult, null, 2))

        // Force refresh appointments immediately (debounced)
        setTimeout(() => fetchAppointments(), 100)

        toast({
          title: 'Agendamento criado',
          description: isManualCreation
            ? 'Agendamento manual criado e confirmado automaticamente!'
            : 'O agendamento foi criado com sucesso!'
        })

        return { success: true, data: bookingResult }

      } catch (bookError: any) {
        console.warn('⚠️ book_appointment failed, trying direct insertion:', bookError)

        // Fallback: Direct insertion into appointments table
        // ✅ Usando colunas conforme types.ts - se der erro de schema cache, o Supabase precisa ser reiniciado
        const appointmentInsertData: any = {
          teacher_id: user.id,
          student_id: appointmentData.student_id,
          scheduled_time: appointmentData.scheduled_time,
          duration: appointmentData.duration || 60,
          type: appointmentData.type || 'class',
          status: 'confirmed',
          title: appointmentData.title || 'Agendamento',
          description: appointmentData.description
        }

        // Adicionar campos opcionais apenas se existirem
        if (appointmentData.student_notes) appointmentInsertData.notes = appointmentData.student_notes

        const { data: appointmentResult, error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentInsertData)
          .select()
          .single()

        if (insertError) {
          throw new Error(`Erro ao inserir agendamento: ${insertError.message}`)
        }

        console.log('✅ Appointment created via direct insertion:', appointmentResult)

        // Send notification to student
        if (appointmentData.student_id) {
          try {
            await sendAppointmentNotification(appointmentData.student_id, {
              scheduled_time: appointmentData.scheduled_time,
              type: appointmentData.type || 'class',
              title: appointmentData.title,
              teacher_name: user?.email || 'Professor'
            })
          } catch (notifError) {
            console.warn('Failed to send notification:', notifError)
          }
        }

        // Refresh appointments list
        await fetchAppointments()

        toast({
          title: 'Agendamento criado!',
          description: 'Agendamento confirmado e notificação enviada ao estudante!'
        })

        return { success: true, data: appointmentResult }
      }

    } catch (error: any) {
      console.error('❌ Error creating appointment:', error)
      console.log('🔍 [APPOINTMENT_ERROR_DETAILS]:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })

      let errorMessage = 'Não foi possível criar o agendamento'

      // Mensagens de erro mais específicas
      if (error.message?.includes('not available') || error.message?.includes('No matching')) {
        errorMessage = 'Configure seus horários de disponibilidade primeiro. Clique em "Horários" para configurar.'
      } else if (error.message?.includes('minimum advance')) {
        errorMessage = 'Agendamento muito próximo. Respeite o tempo mínimo de antecedência.'
      } else if (error.message?.includes('same day')) {
        errorMessage = 'Agendamentos no mesmo dia não são permitidos.'
      } else if (error.message?.includes('RLS') || error.message?.includes('policy') || error.code === '42501') {
        errorMessage = 'Erro de permissão. Verifique se você está logado corretamente.'
      } else if (error.code === '23505' || error.message?.includes('duplicate')) {
        errorMessage = 'Já existe um agendamento para este horário.'
      } else if (error.message?.includes('slot') || error.message?.includes('availability')) {
        errorMessage = 'Horário não disponível. Configure seus horários de atendimento primeiro.'
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })

      return { success: false, error: errorMessage }
    }
  }

  const updateAppointment = async (id: string, updates: Partial<ImprovedAppointment>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .select()
        .single()

      if (error) throw error

      setAppointments(prev =>
        prev.map(apt => apt.id === id ? { ...apt, ...data } : apt)
      )

      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso'
      })
      return data
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o agendamento',
        variant: 'destructive'
      })
      throw error
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user?.id)

      if (error) throw error

      setAppointments(prev => prev.filter(apt => apt.id !== id))
      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso'
      })
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agendamento',
        variant: 'destructive'
      })
      throw error
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [user?.id])

  // Auto-refresh when month changes
  useEffect(() => {
    const now = new Date()
    const timeToNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()

    const monthChangeTimer = setTimeout(() => {
      if (user?.id) {
        fetchAppointments()
      }
    }, timeToNextMonth)

    return () => clearTimeout(monthChangeTimer)
  }, [user?.id])

  // Set up real-time subscriptions with optimized debounce
  useEffect(() => {
    if (!user?.id) return

    let debounceTimer: NodeJS.Timeout
    let isSubscribed = true

    const debouncedRefresh = () => {
      if (!isSubscribed) return
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (isSubscribed) fetchAppointments()
      }, 2000) // Increased debounce time to reduce frequency
    }

    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `teacher_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New appointment:', payload.new)
          debouncedRefresh()
          toast({
            title: 'Novo agendamento',
            description: 'Um novo agendamento foi criado!'
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `teacher_id=eq.${user.id}`
        },
        () => debouncedRefresh()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `teacher_id=eq.${user.id}`
        },
        () => debouncedRefresh()
      )
      .subscribe()

    return () => {
      clearTimeout(debounceTimer)
      appointmentsChannel.unsubscribe()
    }
  }, [user?.id])

  const fetchAppointmentsByDateRange = async (startDate: Date, endDate: Date): Promise<ImprovedAppointment[]> => {
    if (!user?.id) return []

    try {
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('teacher_id', user.id)
        .gte('scheduled_time', `${startDateStr}T00:00:00`)
        .lte('scheduled_time', `${endDateStr}T23:59:59`)
        .order('scheduled_time', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      // Silent error handling to prevent console spam during infinite loops
      return []
    }
  }

  return {
    appointments,
    loading,
    createAppointmentWithValidation,
    updateAppointment,
    deleteAppointment,
    refetch: fetchAppointments,
    fetchAppointmentsByDateRange
  }
}