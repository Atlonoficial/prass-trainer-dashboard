import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export function useRealTimeScheduleSync(onAppointmentChange?: () => void) {
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!user?.id) return

    // Canal único centralizado com debounce para evitar múltiplas atualizações
    let timeoutId: NodeJS.Timeout | null = null
    
    const debouncedRefresh = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onAppointmentChange?.()
      }, 300)
    }

    // Canal único para todas as mudanças em appointments
    const channel = supabase
      .channel('unified-schedule-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos
          schema: 'public',
          table: 'appointments',
          filter: `or(teacher_id.eq.${user.id},student_id.eq.${user.id})`
        },
        (payload) => {
          console.log('🔄 Appointment change detected:', payload.eventType, payload.new || payload.old)
          
          // Notificação apenas para novos agendamentos
          if (payload.eventType === 'INSERT' && payload.new) {
            const isForTeacher = payload.new.teacher_id === user.id
            const isForStudent = payload.new.student_id === user.id
            
            if (isForTeacher) {
              toast({
                title: 'Novo agendamento',
                description: 'Um novo agendamento foi criado!'
              })
            } else if (isForStudent) {
              toast({
                title: 'Agendamento confirmado',
                description: 'Você tem um novo agendamento!'
              })
            }
          }
          
          debouncedRefresh()
        }
      )
      .subscribe()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      channel.unsubscribe()
    }
  }, [user?.id, onAppointmentChange, toast])
}