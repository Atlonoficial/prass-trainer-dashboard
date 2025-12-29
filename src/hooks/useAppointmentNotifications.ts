import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useAppointmentNotifications() {
  const { toast } = useToast()

  const sendAppointmentNotification = useCallback(async (
    studentId: string,
    appointmentData: {
      scheduled_time: string
      type: string
      title?: string
      teacher_name?: string
    }
  ) => {
    try {
      console.log('Sending appointment notification to student:', studentId)

      // Criar notificação no sistema
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          target_users: [studentId],
          title: 'Novo Agendamento',
          message: `Você tem um novo agendamento: ${appointmentData.title || appointmentData.type} em ${new Date(appointmentData.scheduled_time).toLocaleDateString('pt-BR')}`,
          type: 'appointment',
          metadata: {
            appointment_type: appointmentData.type,
            scheduled_time: appointmentData.scheduled_time,
            teacher_name: appointmentData.teacher_name
          }
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
      }

      // Tentar enviar push notification via OneSignal (se disponível)
      try {
        const { error: pushError } = await supabase.functions.invoke('send-push', {
          body: {
            target_users: [studentId],
            title: 'Novo Agendamento',
            message: `Agendamento confirmado para ${new Date(appointmentData.scheduled_time).toLocaleDateString('pt-BR')}`,
            data: {
              type: 'appointment',
              appointment_type: appointmentData.type,
              scheduled_time: appointmentData.scheduled_time
            }
          }
        })

        if (pushError) {
          console.warn('Push notification failed (non-critical):', pushError)
        }
      } catch (pushError) {
        console.warn('Push notification service unavailable:', pushError)
      }

      return true
    } catch (error) {
      console.error('Error sending appointment notification:', error)
      return false
    }
  }, [])

  const sendAppointmentCancellation = useCallback(async (
    studentId: string,
    appointmentData: {
      scheduled_time: string
      type: string
      title?: string
      reason?: string
    }
  ) => {
    try {
      console.log('Sending cancellation notification to student:', studentId)

      // Criar notificação de cancelamento
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          target_users: [studentId],
          title: 'Agendamento Cancelado',
          message: `Seu agendamento de ${appointmentData.title || appointmentData.type} foi cancelado${appointmentData.reason ? `: ${appointmentData.reason}` : ''}`,
          type: 'appointment_cancelled',
          metadata: {
            appointment_type: appointmentData.type,
            scheduled_time: appointmentData.scheduled_time,
            cancellation_reason: appointmentData.reason
          }
        })

      if (notificationError) {
        console.error('Error creating cancellation notification:', notificationError)
      }

      return true
    } catch (error) {
      console.error('Error sending cancellation notification:', error)
      return false
    }
  }, [])

  return {
    sendAppointmentNotification,
    sendAppointmentCancellation
  }
}