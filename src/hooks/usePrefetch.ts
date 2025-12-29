import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function usePrefetch(userId: string | null) {
  const queryClient = useQueryClient()

  const prefetchStudents = useCallback(async () => {
    if (!userId) return

    await queryClient.prefetchQuery({
      queryKey: ['students', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('teacher_id', userId)
        return data
      },
      staleTime: 2 * 60 * 1000 // 2 minutes
    })
  }, [userId, queryClient])

  const prefetchAppointments = useCallback(async () => {
    if (!userId) return

    await queryClient.prefetchQuery({
      queryKey: ['appointments', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('appointments')
          .select('*')
          .eq('teacher_id', userId)
          .order('scheduled_at', { ascending: true })
        return data
      },
      staleTime: 1 * 60 * 1000 // 1 minute
    })
  }, [userId, queryClient])

  const prefetchPayments = useCallback(async () => {
    if (!userId) return

    await queryClient.prefetchQuery({
      queryKey: ['payments', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('payments')
          .select('*')
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false })
        return data
      },
      staleTime: 1 * 60 * 1000 // 1 minute
    })
  }, [userId, queryClient])

  return {
    prefetchStudents,
    prefetchAppointments,
    prefetchPayments
  }
}
