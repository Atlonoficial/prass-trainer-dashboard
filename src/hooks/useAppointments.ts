import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface Appointment {
  id: string
  title: string
  description?: string | null
  student_id?: string | null
  teacher_id?: string | null
  scheduled_time: string
  type?: string | null
  duration?: number | null
  location?: string | null
  location_id?: string | null
  meeting_link?: string | null
  status?: string | null
  price?: number | null
  payment_status?: string | null
  notes?: string | null
  student_title?: string | null
  student_objectives?: string | null
  student_notes?: string | null
  date?: string | null
  time?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchAppointments = async (includeHistory: boolean = false) => {
    try {
      setLoading(true)
      
      // Calculate date range for 3 months retention
      const now = new Date()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      let query = supabase
        .from('appointments')
        .select('*')
        .order('scheduled_time', { ascending: true })
      
      // Apply teacher filter if user exists
      if (user?.id) {
        query = query.eq('teacher_id', user.id)
      }
      
      // Apply date filter - include 3 months history
      if (includeHistory) {
        query = query.gte('scheduled_time', threeMonthsAgo.toISOString())
      }
      
      const { data, error } = await query

      if (error) throw error
      setAppointments((data || []).map((a) => ({
        ...a,
        scheduled_time: a.scheduled_time as unknown as string,
      })) as Appointment[])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast({ title: 'Erro', description: 'Não foi possível carregar os agendamentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointmentsByDateRange = async (startDate: Date, endDate: Date) => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('appointments')
        .select('*')
        .gte('scheduled_time', startDate.toISOString())
        .lte('scheduled_time', endDate.toISOString())
        .order('scheduled_time', { ascending: true })
      
      if (user?.id) {
        query = query.eq('teacher_id', user.id)
      }
      
      const { data, error } = await query

      if (error) throw error
      
      return (data || []).map((a) => ({
        ...a,
        scheduled_time: a.scheduled_time as unknown as string,
      })) as Appointment[]
    } catch (error) {
      console.error('Error fetching appointments by date range:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()

      if (error) throw error
      toast({ title: 'Sucesso', description: 'Agendamento criado com sucesso' })
      return data as Appointment
    } catch (error) {
      console.error('Error adding appointment:', error)
      toast({ title: 'Erro', description: 'Não foi possível criar o agendamento', variant: 'destructive' })
      throw error
    }
  }

  const updateAppointmentOptimistic = (id: string, updates: Partial<Appointment>) => {
    // Immediate UI update
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === id ? { ...appointment, ...updates } : appointment
      )
    )
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      // Update UI immediately
      updateAppointmentOptimistic(id, updates)
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso' })
      return data as Appointment
    } catch (error) {
      console.error('Error updating appointment:', error)
      // Revert optimistic update on error
      fetchAppointments()
      toast({ title: 'Erro', description: 'Não foi possível atualizar o agendamento', variant: 'destructive' })
      throw error
    }
  }

  useEffect(() => {
    fetchAppointments(true) // Include 3 months history by default
  }, [user?.id])

  // Enhanced real-time subscriptions for appointments
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`appointments-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments', filter: `teacher_id=eq.${user.id}` },
        (payload) => {
          console.log('New appointment created:', payload)
          const a = payload.new as any
          setAppointments((prev) =>
            [...prev, { ...(a as Appointment), scheduled_time: a.scheduled_time as string }].sort(
              (x, y) => new Date(x.scheduled_time).getTime() - new Date(y.scheduled_time).getTime()
            )
          )
          
          // Enhanced notification for new student appointments
          const isStudentBooking = a.student_id && a.student_id !== user.id;
          toast({
            title: isStudentBooking ? 'Novo Agendamento de Aluno' : 'Novo Agendamento',
            description: `${isStudentBooking ? 'Um aluno fez um agendamento' : 'Agendamento criado'} para ${new Date(a.scheduled_time).toLocaleString('pt-BR')}`,
            variant: isStudentBooking ? 'default' : undefined
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `teacher_id=eq.${user.id}` },
        (payload) => {
          console.log('Appointment updated:', payload)
          const updated = payload.new as any
          setAppointments((prev) =>
            prev
              .map((p) => (p.id === updated.id ? { ...(updated as Appointment), scheduled_time: updated.scheduled_time as string } : p))
              .sort((x, y) => new Date(x.scheduled_time).getTime() - new Date(y.scheduled_time).getTime())
          )
          
          toast({
            title: 'Agendamento Atualizado',
            description: 'Um agendamento foi modificado'
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'appointments', filter: `teacher_id=eq.${user.id}` },
        (payload) => {
          console.log('Appointment deleted:', payload)
          const deleted = payload.old as any
          setAppointments((prev) => prev.filter(p => p.id !== deleted.id))
          
          toast({
            title: 'Agendamento Removido',
            description: 'Um agendamento foi cancelado',
            variant: 'destructive'
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, toast])

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setAppointments((prev) => prev.filter(appointment => appointment.id !== id))
      toast({ title: 'Sucesso', description: 'Agendamento excluído com sucesso' })
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir o agendamento', variant: 'destructive' })
      throw error
    }
  }

  const deleteFutureAppointments = async (studentId: string) => {
    try {
      const now = new Date().toISOString()
      
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('student_id', studentId)
        .eq('teacher_id', user?.id)
        .gte('scheduled_time', now)
        .neq('status', 'completed')

      if (error) throw error
      
      // Update local state
      setAppointments((prev) => 
        prev.filter(appointment => 
          !(appointment.student_id === studentId && 
            new Date(appointment.scheduled_time) > new Date() &&
            appointment.status !== 'completed')
        )
      )
      toast({ title: 'Sucesso', description: 'Agendamentos futuros excluídos com sucesso' })
    } catch (error) {
      console.error('Error deleting future appointments:', error)
      toast({ title: 'Erro', description: 'Não foi possível excluir os agendamentos futuros', variant: 'destructive' })
      throw error
    }
  }

  return { 
    appointments, 
    loading, 
    addAppointment, 
    updateAppointment, 
    updateAppointmentOptimistic, 
    deleteAppointment,
    deleteFutureAppointments,
    refetch: fetchAppointments,
    fetchAppointmentsByDateRange
  }
}
