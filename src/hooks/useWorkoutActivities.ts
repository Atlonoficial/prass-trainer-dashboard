import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface WorkoutActivity {
  id: string
  user_id: string
  activity_type: string
  name: string
  distance_meters: number | null
  duration_seconds: number | null
  calories_burned: number | null
  avg_heart_rate: number | null
  max_heart_rate: number | null
  started_at: string
  provider_activity_id: string | null
  connection_id: string
  metadata: any
  created_at: string
}

export function useWorkoutActivities(userId?: string) {
  const [activities, setActivities] = useState<WorkoutActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchActivities = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_activities')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching workout activities:', error)
      toast({
        title: "Erro ao carregar atividades",
        description: "Não foi possível carregar as atividades externas.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActivitiesStats = () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const thisWeek = activities.filter(a => new Date(a.started_at) >= oneWeekAgo)
    const thisMonth = activities.filter(a => new Date(a.started_at) >= oneMonthAgo)

    return {
      total: activities.length,
      thisWeek: thisWeek.length,
      thisMonth: thisMonth.length,
      totalDistance: activities.reduce((sum, a) => sum + (a.distance_meters || 0), 0),
      totalDuration: activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0),
      totalCalories: activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0),
      avgHeartRate: activities.length > 0 
        ? activities.reduce((sum, a) => sum + (a.avg_heart_rate || 0), 0) / activities.length 
        : 0
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [userId])

  return {
    activities,
    loading,
    getActivitiesStats,
    refetch: fetchActivities
  }
}