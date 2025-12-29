import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export interface TeacherAvailabilitySlot {
  id: string
  teacher_id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
  created_at: string
  updated_at: string
}

export function useStudentTeacherAvailability(teacherId?: string) {
  const [availability, setAvailability] = useState<TeacherAvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchTeacherAvailability = async () => {
    if (!teacherId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('weekday', { ascending: true })

      if (error) throw error
      setAvailability(data || [])
    } catch (error) {
      console.error('Error fetching teacher availability:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar a disponibilidade do professor', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  // Get teacher ID from student relationship
  const getMyTeacherId = async () => {
    if (!user?.id) return null
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('teacher_id')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data?.teacher_id || null
    } catch (error) {
      console.error('Error getting teacher ID:', error)
      return null
    }
  }

  useEffect(() => {
    const loadAvailability = async () => {
      let targetTeacherId = teacherId
      
      // If no teacherId provided, get from student relationship
      if (!targetTeacherId && user?.id) {
        targetTeacherId = await getMyTeacherId()
      }
      
      if (targetTeacherId) {
        await fetchTeacherAvailability()
      }
    }
    
    loadAvailability()
  }, [teacherId, user?.id])

  // Real-time subscription for teacher availability changes
  useEffect(() => {
    const setupRealtime = async () => {
      let targetTeacherId = teacherId
      
      if (!targetTeacherId && user?.id) {
        targetTeacherId = await getMyTeacherId()
      }
      
      if (!targetTeacherId) return

      const channel = supabase
        .channel('student_teacher_availability_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teacher_availability',
            filter: `teacher_id=eq.${targetTeacherId}`
          },
          (payload) => {
            console.log('Teacher availability real-time update for student:', payload)
            fetchTeacherAvailability()
            
            // Notify student of availability changes
            if (payload.eventType === 'INSERT') {
              toast({
                title: 'Nova Disponibilidade',
                description: 'Seu professor adicionou novos horários disponíveis'
              })
            } else if (payload.eventType === 'UPDATE') {
              toast({
                title: 'Horários Atualizados',
                description: 'Seu professor atualizou os horários disponíveis'
              })
            } else if (payload.eventType === 'DELETE') {
              toast({
                title: 'Horário Removido',
                description: 'Seu professor removeu alguns horários disponíveis',
                variant: 'destructive'
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtime()
  }, [teacherId, user?.id, toast])

  return { 
    availability, 
    loading, 
    refetch: fetchTeacherAvailability 
  }
}