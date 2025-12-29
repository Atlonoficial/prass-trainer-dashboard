import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface BannerAnalytics {
  bannerId: string
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  uniqueUsers: number
  ctr: number
}

export interface BannerInteractionData {
  bannerId: string
  userId: string
  interactionType: 'view' | 'click'
  createdAt: string
  metadata?: any
}

export interface AnalyticsDateRange {
  startDate?: string
  endDate?: string
}

export function useBannerAnalytics(dateRange?: AnalyticsDateRange) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<BannerAnalytics[]>([])
  const [interactions, setInteractions] = useState<BannerInteractionData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      // Fetch from banner_interactions and calculate metrics
      let query = supabase
        .from('banner_interactions')
        .select('banner_id, user_id, interaction_type, created_at, metadata')

      if (dateRange?.startDate) {
        query = query.gte('created_at', dateRange.startDate)
      }
      if (dateRange?.endDate) {
        query = query.lte('created_at', dateRange.endDate)
      }

      const { data: interactionsData, error } = await query

      if (error) {
        console.error('Error fetching banner interactions:', error)
        return
      }

      // Calculate analytics from interactions
      const calculatedAnalytics = calculateAnalyticsFromInteractions(interactionsData || [])
      setAnalytics(calculatedAnalytics)
      
    } catch (error) {
      console.error('Error in fetchAnalytics:', error)
      setAnalytics([])
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalyticsFromInteractions = (interactionsData: any[]): BannerAnalytics[] => {
    const bannerMap = new Map<string, { detail_views: number; redirect_clicks: number; unique_users: Set<string> }>()

    interactionsData.forEach((interaction) => {
      const bannerId = interaction.banner_id
      
      if (!bannerMap.has(bannerId)) {
        bannerMap.set(bannerId, {
          detail_views: 0,
          redirect_clicks: 0,
          unique_users: new Set()
        })
      }
      
      const stats = bannerMap.get(bannerId)!
      stats.unique_users.add(interaction.user_id)
      
      if (interaction.interaction_type === 'view') {
        stats.detail_views++
      } else if (interaction.interaction_type === 'click') {
        stats.redirect_clicks++
      }
    })

    return Array.from(bannerMap.entries()).map(([bannerId, stats]) => {
      const ctr = stats.detail_views > 0 ? (stats.redirect_clicks / stats.detail_views) * 100 : 0
      
      return {
        bannerId,
        totalImpressions: stats.detail_views,
        totalClicks: stats.redirect_clicks,
        totalConversions: 0,
        uniqueUsers: stats.unique_users.size,
        ctr
      }
    })
  }

  const fetchInteractions = async (bannerId?: string, limit?: number) => {
    if (!user) return

    try {
      let query = supabase
        .from('banner_interactions')
        .select('banner_id, user_id, interaction_type, created_at, metadata')
        .order('created_at', { ascending: false })

      if (bannerId) {
        query = query.eq('banner_id', bannerId)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching interactions:', error)
        return
      }

      const formattedInteractions: BannerInteractionData[] = (data || []).map(item => ({
        bannerId: item.banner_id,
        userId: item.user_id,
        interactionType: item.interaction_type as 'view' | 'click',
        createdAt: item.created_at,
        metadata: item.metadata as any
      }))

      setInteractions(formattedInteractions)
    } catch (error) {
      console.error('Error in fetchInteractions:', error)
      setInteractions([])
    }
  }

  const getTotalMetrics = () => {
    const totalImpressions = analytics.reduce((sum, item) => sum + item.totalImpressions, 0)
    const totalClicks = analytics.reduce((sum, item) => sum + item.totalClicks, 0)
    const totalUniqueUsers = analytics.reduce((sum, item) => sum + item.uniqueUsers, 0)
    const averageCtr = analytics.length > 0 
      ? analytics.reduce((sum, item) => sum + item.ctr, 0) / analytics.length
      : 0

    return {
      totalImpressions,
      totalClicks,
      totalUniqueUsers,
      averageCtr
    }
  }

  useEffect(() => {
    if (user) {
      fetchAnalytics()
      
      // Configurar listener para atualizações em tempo real
      const channel = supabase
        .channel('banner-interactions-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'banner_interactions'
          },
          (payload) => {
            console.log('[useBannerAnalytics] Real-time update:', payload)
            // Recarregar analytics quando houver mudanças
            fetchAnalytics()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'banner_analytics'
          },
          (payload) => {
            console.log('[useBannerAnalytics] Analytics real-time update:', payload)
            // Recarregar analytics quando houver mudanças nas métricas
            fetchAnalytics()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, dateRange])

  return {
    analytics,
    interactions,
    loading,
    fetchAnalytics,
    fetchInteractions,
    getTotalMetrics
  }
}