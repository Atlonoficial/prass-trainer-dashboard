import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface WorkoutSession {
  id: string
  user_id: string
  workout_id: string | null
  start_time: string
  end_time: string | null
  total_duration: number | null
  calories_burned: number | null
  rating: number | null
  notes: string | null
  exercises: any
  created_at: string
}

export function useWorkoutSessions(userId?: string) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSessions = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching workout sessions:', error)
      toast({
        title: "Erro ao carregar sessões",
        description: "Não foi possível carregar as sessões de treino.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getSessionsStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const thisWeek = sessions.filter(s => new Date(s.start_time) >= oneWeekAgo)
    const thisMonth = sessions.filter(s => new Date(s.start_time) >= oneMonthAgo)

    return {
      total: sessions.length,
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.total_duration || 0), 0),
      totalCalories: sessions.reduce((sum, s) => sum + (s.calories_burned || 0), 0),
      avgRating: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.length 
        : 0,
      completedSessions: sessions.filter(s => s.end_time !== null).length
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [userId])

  return {
    sessions,
    loading,
    getSessionsStats,
    refetch: fetchSessions
  }
}