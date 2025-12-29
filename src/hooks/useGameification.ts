import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Achievement {
  id: string
  title: string
  description?: string
  icon: string
  rarity: string
  points_reward: number
  condition_type: string
  condition_value: number
  condition_data: any
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  points_earned: number
  achievement?: Achievement
}

export interface GamificationActivity {
  id: string
  user_id: string
  activity_type: string
  points_earned: number
  description: string
  metadata: any
  created_at: string
}

export interface UserPoints {
  id?: string
  user_id: string
  total_points: number
  current_streak: number
  longest_streak: number
  last_activity_date?: string
  level: number
  created_at?: string
  updated_at?: string
}

export function useGameification(userId?: string) {
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [activities, setActivities] = useState<GamificationActivity[]>([])
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchUserPoints = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setUserPoints(data || null)
    } catch (error) {
      console.error('Error fetching user points:', error)
    }
  }

  const fetchUserAchievements = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })

      if (error) throw error
      setUserAchievements(data || [])
    } catch (error) {
      console.error('Error fetching user achievements:', error)
    }
  }

  const fetchActivities = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('gamification_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const fetchAvailableAchievements = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('points_reward', { ascending: true })

      if (error) throw error
      setAvailableAchievements(data || [])
    } catch (error) {
      console.error('Error fetching available achievements:', error)
    }
  }

  const awardPoints = async (
    activityType: GamificationActivity['activity_type'],
    description: string = '',
    metadata: any = {},
    customPoints?: number
  ) => {
    if (!userId) return

    try {
      // Use enhanced function with better error handling and duplicate prevention
      const { data, error } = await supabase.rpc('award_points_enhanced_v3', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_description: description,
        p_metadata: metadata,
        p_custom_points: customPoints
      })

      if (error) throw error

      const result = data as any
      if (result && result.success) {
        // Only refresh if points were actually awarded
        await Promise.all([
          fetchUserPoints(),
          fetchActivities(),
          fetchUserAchievements()
        ])

        toast({
          title: "Pontos ganhos!",
          description: `Você ganhou ${result.points_awarded} pontos: ${description}`,
        })

        // Check for level up
        if (result.level_up) {
          toast({
            title: "🎉 Subiu de nível!",
            description: `Parabéns! Você alcançou o nível ${result.level}!`,
          })
        }
      } else if (result && result.duplicate) {
        // Silently ignore duplicates for better UX
        console.log('Duplicate activity ignored:', result.message)
      } else if (result && result.daily_limit_reached) {
        toast({
          title: "Limite diário atingido",
          description: "Você atingiu o limite de pontos por hoje. Continue amanhã!",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error awarding points:', error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar os pontos.",
        variant: "destructive",
      })
    }
  }

  const checkAchievements = async () => {
    if (!userId) return

    try {
      const { error } = await supabase.rpc('check_and_award_achievements', {
        p_user_id: userId
      })

      if (error) throw error

      // Refresh achievements
      await fetchUserAchievements()
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'bronze': return 'text-amber-600'
      case 'silver': return 'text-slate-400'
      case 'gold': return 'text-yellow-500'
      case 'platinum': return 'text-purple-500'
      case 'diamond': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const getRarityBg = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'bronze': return 'bg-amber-100 border-amber-200'
      case 'silver': return 'bg-slate-100 border-slate-200'
      case 'gold': return 'bg-yellow-100 border-yellow-200'
      case 'platinum': return 'bg-purple-100 border-purple-200'
      case 'diamond': return 'bg-blue-100 border-blue-200'
      default: return 'bg-gray-100 border-gray-200'
    }
  }

  const getActivityTypeLabel = (type: GamificationActivity['activity_type']) => {
    switch (type) {
      case 'training_completed': return 'Treino Completo'
      case 'progress_logged': return 'Progresso Registrado'
      case 'appointment_attended': return 'Consulta Realizada'
      case 'achievement_earned': return 'Conquista Desbloqueada'
      case 'reward_redeemed': return 'Recompensa Resgatada'
      case 'level_up': return 'Subiu de Nível'
      case 'streak_milestone': return 'Marco de Sequência'
      default: return type
    }
  }

  const getProgressToNextLevel = () => {
    if (!userPoints) return { progress: 0, pointsNeeded: 100 }
    
    const currentLevelPoints = Math.pow(userPoints.level - 1, 2) * 100
    const nextLevelPoints = Math.pow(userPoints.level, 2) * 100
    const progress = ((userPoints.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    const pointsNeeded = nextLevelPoints - userPoints.total_points

    return { progress: Math.max(0, Math.min(100, progress)), pointsNeeded: Math.max(0, pointsNeeded) }
  }

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([
        fetchUserPoints(),
        fetchUserAchievements(),
        fetchActivities(),
        fetchAvailableAchievements()
      ])
      setLoading(false)
    }

    if (userId) {
      fetchAllData()
    }
  }, [userId])

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return

    const pointsSubscription = supabase
      .channel('user-points-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_points',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchUserPoints()
      })
      .subscribe()

    const achievementsSubscription = supabase
      .channel('user-achievements-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchUserAchievements()
      })
      .subscribe()

    const activitiesSubscription = supabase
      .channel('activities-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gamification_activities',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchActivities()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(pointsSubscription)
      supabase.removeChannel(achievementsSubscription)
      supabase.removeChannel(activitiesSubscription)
    }
  }, [userId])

  return {
    userPoints,
    userAchievements,
    activities,
    availableAchievements,
    loading,
    awardPoints,
    checkAchievements,
    getRarityColor,
    getRarityBg,
    getActivityTypeLabel,
    getProgressToNextLevel,
    refetch: async () => {
      setLoading(true)
      await Promise.all([
        fetchUserPoints(),
        fetchUserAchievements(),
        fetchActivities(),
        fetchAvailableAchievements()
      ])
      setLoading(false)
    }
  }
}