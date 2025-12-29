import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface StudentAppointment {
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
  created_at: string
  updated_at: string
}

export function useStudentAppointments() {
  const [appointments, setAppointments] = useState<StudentAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchAppointments = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', user.id)
        .order('scheduled_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching student appointments:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar seus agendamentos', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          notes: reason ? `Cancelado pelo aluno: ${reason}` : 'Cancelado pelo aluno'
        })
        .eq('id', appointmentId)
        .eq('student_id', user?.id)

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Agendamento cancelado com sucesso' 
      })
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível cancelar o agendamento', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  const rescheduleAppointment = async (appointmentId: string, newScheduledTime: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          scheduled_time: newScheduledTime,
          status: 'rescheduled',
          notes: 'Reagendado pelo aluno'
        })
        .eq('id', appointmentId)
        .eq('student_id', user?.id)

      if (error) throw error

      toast({ 
        title: 'Sucesso', 
        description: 'Agendamento reagendado com sucesso' 
      })
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível reagendar o agendamento', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [user?.id])

  // Real-time subscription for student appointments
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('student_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `student_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Student appointment real-time update:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newAppointment = payload.new as StudentAppointment
            setAppointments(prev => [...prev, newAppointment].sort((a, b) => 
              new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
            ))
            
            toast({
              title: 'Novo Agendamento',
              description: `Agendamento marcado para ${new Date(newAppointment.scheduled_time).toLocaleString()}`
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedAppointment = payload.new as StudentAppointment
            setAppointments(prev => 
              prev.map(apt => 
                apt.id === updatedAppointment.id ? updatedAppointment : apt
              ).sort((a, b) => 
                new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
              )
            )
            
            toast({
              title: 'Agendamento Atualizado',
              description: 'Seu agendamento foi atualizado pelo professor'
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedAppointment = payload.old as StudentAppointment
            setAppointments(prev => 
              prev.filter(apt => apt.id !== deletedAppointment.id)
            )
            
            toast({
              title: 'Agendamento Cancelado',
              description: 'Um agendamento foi cancelado',
              variant: 'destructive'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, toast])

  return { 
    appointments, 
    loading, 
    cancelAppointment,
    rescheduleAppointment,
    refetch: fetchAppointments 
  }
}