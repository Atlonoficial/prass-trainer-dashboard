import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { realtimeManager } from '@/services/realtimeManager'

// Unified interfaces
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

export interface Reward {
  id: string
  title: string
  description?: string
  points_cost: number
  image_url?: string
  stock: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  reward_id: string
  status: string
  admin_notes?: string
  created_at: string
  updated_at?: string
  points_spent?: number
  reward?: Reward
  student?: any
  student_name?: string
  student_avatar?: string
}

// Enhanced cache with TTL
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
interface CacheEntry<T> {
  data: T
  timestamp: number
}

class GamificationCache {
  private cache = new Map<string, CacheEntry<any>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  getSize(): number {
    return this.cache.size
  }
}

const cache = new GamificationCache()

export function useOptimizedGamification(userId?: string) {
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [activities, setActivities] = useState<GamificationActivity[]>([])
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Optimized fetch function with single query
  const fetchAllData = useCallback(async () => {
    if (!userId) return

    const cacheKey = `gamification-${userId}`
    const cached = cache.get<any>(cacheKey)
    
    if (cached) {
      setUserPoints(cached.userPoints || null)
      setUserAchievements(cached.userAchievements || [])
      setActivities(cached.activities || [])
      setAvailableAchievements(cached.availableAchievements || [])
      setRewards(cached.rewards || [])
      setRedemptions(cached.redemptions || [])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Parallel queries for better performance
      const [
        pointsResult,
        achievementsResult,
        activitiesResult,
        availableAchievementsResult,
        rewardsResult,
        redemptionsResult
      ] = await Promise.all([
        supabase
          .from('user_points')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        
        supabase
          .from('user_achievements')
          .select('*, achievement:achievements(*)')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false }),
        
        supabase
          .from('gamification_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('achievements')
          .select('*')
          .eq('is_active', true)
          .order('points_reward', { ascending: true }),
        
        supabase
          .from('rewards_items')
          .select('*')
          .eq('is_active', true)
          .order('points_cost', { ascending: true }),
        
        supabase
          .from('reward_redemptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ])

      // For teachers, we need to get redemptions with student info
      let redemptionsData = redemptionsResult.data || []
      
      if (redemptionsData.length > 0) {
        // Get student profiles for redemptions
        const userIds = [...new Set(redemptionsData.map(r => r.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds)

        // Create profiles map
        const profilesMap = (profiles || []).reduce((acc: any, profile: any) => {
          acc[profile.id] = profile
          return acc
        }, {})
        
        // Add student info to redemptions
        redemptionsData = redemptionsData.map(redemption => ({
          ...redemption,
          student_name: profilesMap[redemption.user_id]?.name || 'Usuário',
          student_avatar: profilesMap[redemption.user_id]?.avatar_url
        }))
      }

      const data = {
        userPoints: pointsResult.data,
        userAchievements: achievementsResult.data || [],
        activities: activitiesResult.data || [],
        availableAchievements: availableAchievementsResult.data || [],
        rewards: rewardsResult.data || [],
        redemptions: redemptionsData
      }

      // Cache the results
      cache.set(cacheKey, data)

      setUserPoints(data.userPoints)
      setUserAchievements(data.userAchievements)
      setActivities(data.activities)
      setAvailableAchievements(data.availableAchievements)
      setRewards(data.rewards)
      setRedemptions(data.redemptions)
    } catch (error) {
      console.error('Error fetching gamification data:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de gamificação.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  // Auto-create user gamification data if needed
  const ensureUserData = useCallback(async (userId: string) => {
    try {
      // Try to create user_points record if it doesn't exist
      await supabase
        .from('user_points')
        .upsert({
          user_id: userId,
          total_points: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: new Date().toISOString().split('T')[0]
        }, {
          onConflict: 'user_id'
        })
    } catch (error) {
      console.error('Error ensuring user data:', error)
    }
  }, [])

  // Optimized award points function with auto-creation
  const awardPoints = useCallback(async (
    activityType: string,
    description: string = '',
    metadata: any = {},
    customPoints?: number
  ) => {
    if (!userId) return

    try {
      // Ensure user has data before awarding points
      await ensureUserData(userId)
      
      const { data, error } = await supabase.rpc('award_points_enhanced_v3', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_description: description,
        p_metadata: metadata,
        p_custom_points: customPoints
      })

      if (error) throw error

      const result = data as any
      if (result?.success) {
        // Manual achievement verification after awarding points
        try {
          await supabase.rpc('check_and_award_achievements', {
            p_user_id: userId
          })
        } catch (achievementError) {
          console.error('Error checking achievements:', achievementError)
        }

        // Invalidate cache and refresh
        cache.invalidate(userId)
        await fetchAllData()

        toast({
          title: "Pontos ganhos!",
          description: `Você ganhou ${result.points_awarded} pontos: ${description}`,
        })

        if (result.level_up) {
          toast({
            title: "🎉 Subiu de nível!",
            description: `Parabéns! Você alcançou o nível ${result.level}!`,
          })
        }
      } else if (result?.duplicate) {
        console.log('Duplicate activity ignored:', result.message)
      } else if (result?.daily_limit_reached) {
        toast({
          title: "Limite diário atingido",
          description: "Você atingiu o limite de pontos por hoje. Continue amanhã!",
          variant: "destructive",
        })
      }

      return result
    } catch (error) {
      console.error('Error awarding points:', error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar os pontos.",
        variant: "destructive",
      })
    }
  }, [userId, fetchAllData, toast])

  // Optimized redeem reward function
  const redeemReward = useCallback(async (rewardId: string) => {
    if (!userId) return

    try {
      const { data, error } = await supabase.rpc('redeem_reward', {
        _reward_id: rewardId
      })

      if (error) throw error

      const result = data as any
      if (result?.success) {
        // Invalidate cache and refresh
        cache.invalidate(userId)
        await fetchAllData()

        toast({
          title: "Recompensa resgatada!",
          description: `Você resgatou ${result.reward_title} por ${result.points_cost} pontos.`,
        })
      } else {
        toast({
          title: "Erro ao resgatar",
          description: result?.message || "Não foi possível resgatar a recompensa.",
          variant: "destructive",
        })
      }

      return result
    } catch (error) {
      console.error('Error redeeming reward:', error)
      toast({
        title: "Erro",
        description: "Não foi possível resgatar a recompensa.",
        variant: "destructive",
      })
    }
  }, [userId, fetchAllData, toast])

  // Utility functions with memoization
  const getRarityColor = useMemo(() => (rarity: string) => {
    switch (rarity) {
      case 'bronze': return 'text-amber-600'
      case 'silver': return 'text-slate-400'
      case 'gold': return 'text-yellow-500'
      case 'platinum': return 'text-purple-500'
      case 'diamond': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }, [])

  const getRarityBg = useMemo(() => (rarity: string) => {
    switch (rarity) {
      case 'bronze': return 'bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
      case 'silver': return 'bg-slate-100 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
      case 'gold': return 'bg-yellow-100 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
      case 'platinum': return 'bg-purple-100 border-purple-200 dark:bg-purple-950 dark:border-purple-800'
      case 'diamond': return 'bg-blue-100 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
      default: return 'bg-gray-100 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
    }
  }, [])

  const getActivityTypeLabel = useMemo(() => (type: string) => {
    const labels: Record<string, string> = {
      training_completed: 'Treino Completo',
      daily_checkin: 'Check-in Diário',
      meal_logged: 'Refeição Registrada',
      progress_logged: 'Progresso Registrado',
      goal_achieved: 'Meta Alcançada',
      appointment_attended: 'Consulta Realizada',
      achievement_earned: 'Conquista Desbloqueada',
      reward_redeemed: 'Recompensa Resgatada',
      level_up: 'Subiu de Nível',
      streak_milestone: 'Marco de Sequência',
      physical_assessment: 'Avaliação Física',
      medical_exam: 'Exame Médico',
      ai_interaction: 'Interação com IA',
      teacher_message: 'Mensagem do Professor'
    }
    return labels[type] || type
  }, [])

  const getProgressToNextLevel = useMemo(() => {
    if (!userPoints) return { progress: 0, pointsNeeded: 100, nextLevel: 2 }
    
    const currentLevel = userPoints.level
    const nextLevel = currentLevel + 1
    const currentLevelPoints = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelPoints = Math.pow(currentLevel, 2) * 100
    const progress = ((userPoints.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    const pointsNeeded = nextLevelPoints - userPoints.total_points

    return { 
      progress: Math.max(0, Math.min(100, progress)), 
      pointsNeeded: Math.max(0, pointsNeeded),
      nextLevel,
      currentLevelPoints,
      nextLevelPoints
    }
  }, [userPoints])

  // Enhanced statistics
  const getEngagementStats = useMemo(() => {
    if (!activities.length) return {
      totalActivities: 0,
      averagePointsPerActivity: 0,
      mostActiveDay: 'N/A',
      lastActivity: null,
      streakStatus: 'inactive'
    }

    const totalActivities = activities.length
    const totalPointsFromActivities = activities.reduce((sum, activity) => sum + activity.points_earned, 0)
    const averagePointsPerActivity = Math.round(totalPointsFromActivities / totalActivities)
    
    // Find most active day
    const dayCount: Record<string, number> = {}
    activities.forEach(activity => {
      const day = new Date(activity.created_at).toLocaleDateString('pt-BR', { weekday: 'long' })
      dayCount[day] = (dayCount[day] || 0) + 1
    })
    const mostActiveDay = Object.entries(dayCount).reduce((a, b) => dayCount[a[0]] > dayCount[b[0]] ? a : b)[0] || 'N/A'
    
    const lastActivity = activities[0] || null
    const streakStatus = userPoints?.current_streak ? 
      (userPoints.current_streak >= 7 ? 'fire' : userPoints.current_streak >= 3 ? 'good' : 'building') : 
      'inactive'

    return {
      totalActivities,
      averagePointsPerActivity,
      mostActiveDay,
      lastActivity,
      streakStatus
    }
  }, [activities, userPoints])

  // ✅ FASE 1: Realtime Manager subscriptions
  useEffect(() => {
    if (!userId) return

    console.log('🔗 [useOptimizedGamification] Configurando Realtime Manager subscriptions')

    const listenerIds: string[] = []

    // User points subscription
    listenerIds.push(
      realtimeManager.subscribe(
        'user_points',
        '*',
        () => {
          console.log('📡 [Gamification] Realtime: Points updated')
          cache.invalidate(userId)
          fetchAllData()
        },
        `user_id=eq.${userId}`
      )
    )

    // Activities subscription (apenas INSERTs)
    listenerIds.push(
      realtimeManager.subscribe(
        'gamification_activities',
        'INSERT',
        () => {
          console.log('📡 [Gamification] Realtime: Activity added')
          cache.invalidate(userId)
          fetchAllData()
        },
        `user_id=eq.${userId}`
      )
    )

    // Achievements subscription
    listenerIds.push(
      realtimeManager.subscribe(
        'user_achievements',
        'INSERT',
        () => {
          console.log('📡 [Gamification] Realtime: Achievement unlocked')
          cache.invalidate(userId)
          fetchAllData()
        },
        `user_id=eq.${userId}`
      )
    )

    console.log('✅ [useOptimizedGamification] Realtime Manager configurado:', listenerIds.length, 'listeners')

    return () => {
      console.log('🧹 [useOptimizedGamification] Removendo listeners:', listenerIds.length)
      listenerIds.forEach(id => realtimeManager.unsubscribe(id))
    }
  }, [userId, fetchAllData])

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchAllData()
    }
  }, [userId, fetchAllData])

  return {
    // Data
    userPoints,
    userAchievements,
    activities,
    availableAchievements,
    rewards,
    redemptions,
    loading,
    
    // Actions
    awardPoints,
    redeemReward,
    
    // Utilities
    getRarityColor,
    getRarityBg,
    getActivityTypeLabel,
    getProgressToNextLevel,
    getEngagementStats,
    
    // Cache management
    clearCache: () => cache.invalidate(),
    getCacheSize: () => cache.getSize(),
    
    // Refresh
    refetch: fetchAllData
  }
}