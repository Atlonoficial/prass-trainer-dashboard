import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface StudentAppointmentDetails {
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

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export interface UseStudentAppointmentsByTeacherOptions {
  historyLimit?: number // Limite de itens no histórico (padrão: 10)
  pastDaysLimit?: number // Limite de dias no passado (padrão: 30)
  showFullHistory?: boolean // Se true, mostra histórico completo
}

export function useStudentAppointmentsByTeacher(
  studentId?: string, 
  teacherId?: string,
  options: UseStudentAppointmentsByTeacherOptions = {}
) {
  const [appointments, setAppointments] = useState<StudentAppointmentDetails[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const { 
    historyLimit = 10, 
    pastDaysLimit = 30, 
    showFullHistory = false 
  } = options

  const fetchStudentAppointments = async () => {
    if (!studentId || !teacherId) return
    
    // Validate UUIDs before making the query
    if (!isValidUUID(studentId)) {
      console.error('Invalid studentId UUID:', studentId)
      toast({ 
        title: 'Erro', 
        description: 'ID do aluno inválido', 
        variant: 'destructive' 
      })
      return
    }
    
    if (!isValidUUID(teacherId)) {
      console.error('Invalid teacherId UUID:', teacherId)
      toast({ 
        title: 'Erro', 
        description: 'ID do professor inválido', 
        variant: 'destructive' 
      })
      return
    }
    
    try {
      setLoading(true)
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)

      // Se não está mostrando histórico completo, aplicar filtros de limite
      if (!showFullHistory) {
        // Filtrar por data (últimos X dias para histórico)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - pastDaysLimit)
        
        query = query.gte('scheduled_time', cutoffDate.toISOString())
      }

      // Se não está mostrando histórico completo, aplicar limite de registros
      if (!showFullHistory && historyLimit) {
        query = query.limit(historyLimit + 20) // +20 para incluir agendamentos futuros
      }

      query = query.order('scheduled_time', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Error fetching student appointments by teacher:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar os agendamentos do aluno', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, status: string, notes?: string) => {
    // Validate appointmentId UUID
    if (!isValidUUID(appointmentId)) {
      console.error('Invalid appointmentId UUID:', appointmentId)
      toast({ 
        title: 'Erro', 
        description: 'ID do agendamento inválido', 
        variant: 'destructive' 
      })
      throw new Error('Invalid appointment ID')
    }

    // Validate teacherId if available
    if (teacherId && !isValidUUID(teacherId)) {
      console.error('Invalid teacherId UUID:', teacherId)
      toast({ 
        title: 'Erro', 
        description: 'ID do professor inválido', 
        variant: 'destructive' 
      })
      throw new Error('Invalid teacher ID')
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('teacher_id', teacherId)

      if (error) throw error

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status, notes: notes || apt.notes } 
            : apt
        )
      )

      toast({ 
        title: 'Sucesso', 
        description: `Agendamento ${status === 'confirmed' ? 'confirmado' : 'atualizado'} com sucesso` 
      })
    } catch (error) {
      console.error('Error updating appointment status:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível atualizar o agendamento', 
        variant: 'destructive' 
      })
      throw error
    }
  }

  // Real-time subscription for appointments changes
  useEffect(() => {
    if (!studentId || !teacherId) return

    const channel = supabase
      .channel(`student_appointments_${studentId}_${teacherId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `student_id=eq.${studentId}&teacher_id=eq.${teacherId}`
        },
        (payload) => {
          console.log('Student appointment update:', payload)
          fetchStudentAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, teacherId])

  useEffect(() => {
    fetchStudentAppointments()
  }, [studentId, teacherId, showFullHistory])

  return { 
    appointments, 
    loading, 
    updateAppointmentStatus,
    refetch: fetchStudentAppointments 
  }
}